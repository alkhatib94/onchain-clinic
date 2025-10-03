import './globals.css'

export const metadata = { title: 'Base Score', description: 'OnChain Clinic' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en'>
      <body className='min-h-screen'>{children}</body>
    </html>
  )
}
