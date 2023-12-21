import { QuickJSAsyncContext, QuickJSHandle } from 'quickjs-emscripten'
import { Arena } from 'quickjs-emscripten-sync'

export type VM = QuickJSAsyncContext & { arena: Arena }

export const defineGlobalObject = (vm: VM, objectName: string) => {
  const handle = vm.newObject()
  vm.setProp(vm.global, objectName, handle)
  return handle
}

export const defineMethod = (
  vm: VM,
  objectHandle: QuickJSHandle,
  methodName: string,
  method: (...encodedArgs: any[]) => void
) => {
  vm.newFunction(methodName, (...encodedArgs: any[]) => {
    const args = encodedArgs.map(vm.dump)
    return method(...args)
  }).consume((methodHandle) => vm.setProp(objectHandle, methodName, methodHandle))
}

export const defineAsyncMethod = (
  vm: VM,
  objectHandle: QuickJSHandle,
  methodName: string,
  method: (...encodedArgs: any[]) => Promise<any>
) => {
  vm.newAsyncifiedFunction(methodName, async (...encodedArgs) => {
    const args = encodedArgs.map(vm.dump) as any[]
    return await method(...args)
  }).consume((methodHandle) => vm.setProp(objectHandle, methodName, methodHandle))
}

export const executeFunction = async (vm: VM, funcName: string, args: any[]) => {
  const stringArgs = args.map((arg) => JSON.stringify(arg)).join(',')

  // Hold the result in a global reference so we can call methods on it later
  const reference = `_refs[\`${Date.now()}|${Math.random()}\`]`

  const evaluatedCode = await vm.evalCodeAsync(`${reference} = ${funcName}(${stringArgs})`)

  // Handle error
  if (evaluatedCode.error) {
    const err = vm.dump(evaluatedCode.error)
    const { name, message, stack } = err
    const error = new Error(message)
    error.name = name
    error.stack = `${name}: ${message}\n${stack}`
    throw error
  }

  const result = vm.dump(evaluatedCode.value)
  if (!(result instanceof Object)) {
    return result
  }

  // Keep a reference to evaluatedCode.value so we can call methods like nextPage()
  result.bridge = new Proxy(result, {
    get: (target: any, property: string) => {
      if (property in target) {
        return target[property]
      }

      return async (...args: any[]) => {
        return await executeFunction(vm, `${reference}.${property}`, args)
      }
    },
  })

  return result
}

export const createArray = (vm: VM, array: any[]) => {
  const arrayHandle = vm.newArray()
  array.forEach((value, key) => vm.setProp(arrayHandle, key, value))
  return arrayHandle
}
