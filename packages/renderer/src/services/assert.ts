function assert(value: any, message: string): asserts value {
  if (!value) {
    throw new Error(`Assertion failed: ${message}`)
  }
}

export default assert
