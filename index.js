var assert = require('assert')

var Reader = module.exports = function(options) {
  //TODO - remove for version 1.0
  if(typeof options == 'number') {
    options = { headerSize: options }
  }
  options = options || {}
  this.offset = 0
  this.lastChunk = false
  this.chunk = null
  this.chunkLength = 0
  this.headerSize = options.headerSize || 0
  this.lengthPadding = options.lengthPadding || 0
  this.lengthLE = options.lengthLE || false
  this.lengthSize = options.lengthSize || 4
  assert( this.lengthSize <= 6, 'lengths of more than 6 bytes are not currently supported' )
  this.header = null
  assert(this.headerSize <= 6 , 'pre-length header with more than a 6 byte length not currently supported')
}

Reader.prototype.addChunk = function(chunk) {
  if (!this.chunk || this.offset === this.chunkLength) {
    this.chunk = chunk
    this.chunkLength = chunk.length
    this.offset = 0
    return
  }

  var newChunkLength = chunk.length
  var newLength = this.chunkLength + newChunkLength

  if (newLength > this.chunk.length) {
    var newBufferLength = this.chunk.length * 2
    while (newLength >= newBufferLength) {
      newBufferLength *= 2
    }
    var newBuffer = new Buffer(newBufferLength)
    this.chunk.copy(newBuffer)
    this.chunk = newBuffer
  }
  chunk.copy(this.chunk, this.chunkLength)
  this.chunkLength = newLength
}

Reader.prototype.read = function() {
  if(this.chunkLength < (this.headerSize + this.lengthSize + this.offset)) {
    return false
  }

  if(this.headerSize) {
    if ( this.lengthLE )
      this.header = this.chunk.readUIntLE( this.offset, this.headerSize );
    else this.header = this.chunk.readUIntBE( this.offset, this.headerSize );
  }

  //read length of next item
  var length = this.lengthPadding;
  if ( this.lengthLE )
    length += this.chunk.readUIntLE( this.offset + this.headerSize, this.lengthSize );
  else length += this.chunk.readUIntBE( this.offset + this.headerSize, this.lengthSize );

  //next item spans more chunks than we have
  var remaining = this.chunkLength - (this.offset + this.lengthSize + this.headerSize)
  if(length > remaining) {
    return false
  }

  this.offset += (this.headerSize + this.lengthSize)
  var result = this.chunk.slice(this.offset, this.offset + length)
  this.offset += length
  return result
}
