var assert = require('assert')

var Reader = module.exports = function(codeSize) {
  this.offset = 0
  this.lastChunk = false
  this.chunk = null
  //TODO - support code length > 1
  this.codeSize = codeSize || 0
  assert(this.codeSize < 2, 'pre-length code >1 not currently supported')
}

Reader.prototype.addChunk = function(chunk) {
  this.offset = 0
  this.chunk = chunk
  if(this.lastChunk) {
    this.chunk = Buffer.concat([this.lastChunk, this.chunk])
    this.lastChunk = false
  }
}

Reader.prototype._save = function() {
  //save any unread chunks for next read
  if(this.offset < this.chunk.length) {
    this.lastChunk = this.chunk.slice(this.offset)
  }
  return false
}

Reader.prototype.read = function() {
  if(this.chunk.length < (this.codeSize + 4 + this.offset)) {
    return this._save()
  }

  if(this.codeSize) {
    var code = this.chunk[this.offset]
  }

  //read length of next item
  var length = this.chunk.readUInt32BE(this.offset + this.codeSize)

  //next item spans more chunks than we have
  var remaining = this.chunk.length - (this.offset + 4 + this.codeSize)
  if(length > remaining) {
    return this._save()
  }

  this.offset += (this.codeSize + 4)
  var result = this.chunk.slice(this.offset, this.offset + length)
  this.offset += length
  return result
}
