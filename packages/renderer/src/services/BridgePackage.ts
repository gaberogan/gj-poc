import { QuickJSAsyncContext } from 'quickjs-emscripten'
import { defineGlobalObject, defineMethod } from './quickjs'

const createBridgePackage = (vm: QuickJSAsyncContext) => {
  const bridgeHandle = defineGlobalObject(vm, 'bridge')

  defineMethod(vm, bridgeHandle, 'log', (...args: any[]) => {
    console.log(...args)
  })
  defineMethod(vm, bridgeHandle, 'isLoggedIn', () => {
    return vm.newNumber(0)
  })
}

export default createBridgePackage
