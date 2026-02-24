'use client'

import dynamic from 'next/dynamic'

const AlchemyGame = dynamic(() => import('@/components/alchemy-game').then(m => m.AlchemyGame), { ssr: false })

export default function Home() {
  return <AlchemyGame />
}
