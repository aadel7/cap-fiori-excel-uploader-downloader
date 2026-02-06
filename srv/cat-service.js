const cds = require('@sap/cds')
const crypto = require('crypto')

module.exports = cds.service.impl(function () {
  const { Files } = this.entities

  this.on('upload', async (req) => {
    const { fileName, mimeType, contentBase64, note } = req.data || {}

    if (!fileName) return req.reject(400, 'fileName is required')
    if (!mimeType) return req.reject(400, 'mimeType is required')
    if (!contentBase64) return req.reject(400, 'contentBase64 is required')

    let buffer
    try {
      buffer = Buffer.from(contentBase64, 'base64')
    } catch (e) {
      return req.reject(400, 'contentBase64 is not valid base64')
    }

    if (!buffer || buffer.length === 0) {
      return req.reject(400, 'File content is empty')
    }

    const checksum = crypto.createHash('sha256').update(buffer).digest('hex')
    const ID = cds.utils.uuid()

    const entry = {
      ID,
      fileName,
      mimeType,
      fileSize: buffer.length,
      content: buffer,
      checksum,
      note: note || null
    }

    await INSERT.into(Files).entries(entry)

    const created = await SELECT.one.from(Files)
      .columns('ID', 'fileName', 'mimeType', 'fileSize', 'checksum', 'note', 'createdAt', 'createdBy', 'modifiedAt', 'modifiedBy')
      .where({ ID })

    return created
  })

  this.on('download', async (req) => {
    const { ID } = req.data || {}
    if (!ID) return req.reject(400, 'ID is required')

    const file = await SELECT.one.from(Files)
      .columns('content', 'fileName', 'mimeType')
      .where({ ID })

    if (!file) return req.reject(404, `File not found for ID ${ID}`)
    if (!file.content) return req.reject(404, `No content stored for ID ${ID}`)

    // Handle different BLOB return formats from HANA
    let buffer

    if (Buffer.isBuffer(file.content)) {
      // Already a Buffer
      buffer = file.content
    } else if (file.content.constructor.name === 'Readable') {
      // It's a Node.js Readable stream - consume it
      buffer = await streamToBuffer(file.content)
    } else if (file.content.data) {
      // Sometimes HANA returns { data: Buffer }
      buffer = Buffer.from(file.content.data)
    } else if (typeof file.content === 'string') {
      // Hex string
      buffer = Buffer.from(file.content, 'hex')
    } else {
      console.error('Unexpected content type:', typeof file.content, file.content.constructor.name)
      return req.reject(500, 'Unexpected content format')
    }

    // Send raw binary via HTTP response
    const res = req._.res
    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream')
    res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`)
    res.setHeader('Content-Length', buffer.length)
    
    res.end(buffer)
  })
})

/**
 * Helper: convert a Readable stream to Buffer
 */
function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = []
    stream.on('data', chunk => chunks.push(chunk))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
}