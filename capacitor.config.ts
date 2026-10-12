import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'app.memento.offline',
  appName: 'Memento',
  webDir: 'out',
  server: {
    androidScheme: 'https',
  },
}

export default config
