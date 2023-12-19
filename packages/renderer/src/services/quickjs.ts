import { QuickJSAsyncContext, QuickJSHandle } from 'quickjs-emscripten'

export const defineGlobalObject = (vm: QuickJSAsyncContext, objectName: string) => {
  const handle = vm.newObject()
  vm.setProp(vm.global, objectName, handle)
  return handle
}

export const defineMethod = (
  vm: QuickJSAsyncContext,
  objectHandle: QuickJSHandle,
  methodName: string,
  method: (...args: any[]) => void
) => {
  vm.newFunction(methodName, (...args: any[]) => {
    const nativeArgs = args.map(vm.dump)
    return method(...nativeArgs)
  }).consume((methodHandle) => vm.setProp(objectHandle, methodName, methodHandle))
}

export const defineAsyncMethod = (
  vm: QuickJSAsyncContext,
  objectHandle: QuickJSHandle,
  methodName: string,
  method: (...args: any[]) => Promise<any>
) => {
  vm.newAsyncifiedFunction(methodName, async (...args) => {
    const nativeArgs = args.map(vm.dump) as any[]
    return await method(...nativeArgs)
  }).consume((methodHandle) => vm.setProp(objectHandle, methodName, methodHandle))
}

export const executeFunction = async (vm: QuickJSAsyncContext, funcName: string, args: any[]) => {
  const stringArgs = args.map((arg) => JSON.stringify(arg)).join(',')
  const evaluatedCode = await vm.evalCodeAsync(`${funcName}(${stringArgs})`)

  if (evaluatedCode.error) {
    const err = vm.dump(evaluatedCode.error)
    const { name, message, stack } = err
    const error = new Error(message)
    error.name = name
    error.stack = `${name}: ${message}\n${stack}`
    throw error
  }

  return vm.unwrapResult(evaluatedCode).consume((it) => vm.dump(it))
}
