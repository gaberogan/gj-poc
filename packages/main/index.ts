import { app, BrowserWindow, ipcMain, net, protocol, session, shell } from 'electron'
import { release } from 'os'
import { join } from 'path'

// Disable annoying console warning, handle this properly later
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

// Disable GPU Acceleration for Windows 7
if (release().startsWith('6.1')) app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

let win: BrowserWindow | null = null

const PAGE_ORIGIN = `http://${process.env['VITE_DEV_SERVER_HOST']}:${process.env['VITE_DEV_SERVER_PORT']}`

async function createWindow() {
  win = new BrowserWindow({
    title: 'GrayJay',
    webPreferences: {
      webSecurity: false,
      contextIsolation: false,
      nodeIntegration: true,
      nodeIntegrationInSubFrames: true,
      nodeIntegrationInWorker: false,
      preload: join(__dirname, '../preload/index.cjs'),
    },
  })

  // Whitelist protocols

  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    const url = new URL(details.url)

    // Allow websocket connection for development
    if (details.url === PAGE_ORIGIN.replace('http:', 'ws:') + '/') {
      return callback({})
    }

    // Whitelisted protocols
    if (['http:', 'https:', 'devtools:'].includes(url.protocol)) {
      return callback({})
    }

    throw new Error(`Unsupported protocol ${url.protocol} for url ${details.url}`)
  })

  // Assign each plugin to a fetch client with whitelisted URLs

  let fetchClients: { [key: string]: string[] } = {}

  ipcMain.handle('addFetchClient', (ev, id: string, urls: string[]) => {
    fetchClients[id] = urls
  })
  ipcMain.handle('removeFetchClient', (ev, id: string) => {
    delete fetchClients[id]
  })

  // Validate HTTP requests with Origin, localhost check, and allowUrls

  const handleHttpRequest = async (req: Request) => {
    const url = new URL(req.url)

    const originHeader = req.headers.get('Origin')
    req.headers.delete('Origin')

    if (originHeader || (url.origin === PAGE_ORIGIN && !url.pathname.includes('.js'))) {
      return await net.fetch(req, { bypassCustomProtocolHandlers: true })
    }

    const allowedUrls = fetchClients[req.headers.get('Fetch-Id') as string]
    const urlIsAllowed = allowedUrls?.includes('everywhere') || allowedUrls?.includes(url.hostname)

    if (!urlIsAllowed) {
      throw new Error(
        `Unable to fetch: URL must include Origin header, request to localhost, or be listed in plugin's allowUrls (${req.url})`
      )
    }

    const res = await net.fetch(req, { bypassCustomProtocolHandlers: true })

    // Strip headers from response
    return new Response(res.body)
  }
  protocol.handle('http', handleHttpRequest)
  protocol.handle('https', handleHttpRequest)

  // Do not support the file protocol, instead use custom protocols

  protocol.handle('file', async (req) => {
    throw new Error(`Unsupported protocol file: for url ${req.url}`)
  })

  // Load the app into the browser window

  if (app.isPackaged) {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  } else {
    const url = PAGE_ORIGIN
    win.loadURL(url)
    // win.webContents.openDevTools()
  }

  // Make all links open with the browser, not with the application

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  win = null
  if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    createWindow()
  }
})
