var assert = require('assert')

var Reader = module.exports = function(options) {
  //TODO - remove for version 1.0
  if(typeof options == 'number') {
    options = { headerSize: options }
  }
  options = options || {}
  this.offset = 0
  this.lastChunk = false
  this.chunk = Buffer.alloc(4);
  this.chunkLength = 0;
  this.headerSize = options.headerSize || 0
  this.lengthPadding = options.lengthPadding || 0
  this.header = null
  assert(this.headerSize < 2, 'pre-length header of more than 1 byte length not currently supported')
}

Reader.prototype.addChunk = function(chunk) {
  var newChunkLength = chunk.length;
  var newLength = this.chunkLength + newChunkLength;

  if (newLength > this.chunk.length) {
    var newBufferLength = this.chunk.length * 2;
    while (newLength >= newBufferLength) {
      newBufferLength *= 2;
    }
    var newBuffer = new Buffer(newBufferLength);
    this.chunk.copy(newBuffer);
    this.chunk = newBuffer;
  }
  chunk.copy(this.chunk, this.chunkLength);
  this.chunkLength = newLength;

  // If more than half of the data has been read, shrink
  // the buffer and reset the offset to reclaim the memory
  var halfLength = this.chunk.length / 2;
  if (this.offset > halfLength) {
    var newBuffer = new Buffer(halfLength);
    this.chunk.copy(newBuffer, 0, this.offset);
    this.chunk = newBuffer;
    this.chunkLength -= this.offset;
    this.offset = 0;
  }
}

Reader.prototype._save = function() {
  return false
}

Reader.prototype.read = function() {
  if(this.chunkLength < (this.headerSize + 4 + this.offset)) {
    return this._save()
  }

  if(this.headerSize) {
    this.header = this.chunk[this.offset]
  }

  //read length of next item
  var length = this.chunk.readUInt32BE(this.offset + this.headerSize) + this.lengthPadding

  //next item spans more chunks than we have
  var remaining = this.chunkLength - (this.offset + 4 + this.headerSize)
  if(length > remaining) {
    return this._save()
  }

  this.offset += (this.headerSize + 4)
  var result = this.chunk.slice(this.offset, this.offset + length)
  this.offset += length
  return result
}
