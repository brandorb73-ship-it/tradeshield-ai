import Head from 'next/head'
import Dashboard from '../components/Dashboard'

export default function Home() {
  return (
    <div>
      <Head>
        <title>TradeShield AI | Fraud Detection</title>
        <meta name="description" content="Circular trade and fraud detection dashboard" />
      </Head>
      <Dashboard />
    </div>
  )
}
