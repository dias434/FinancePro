"use client"

import { useEffect, useState } from "react"

interface WelcomeAnimationProps {
  userName: string
}

export function WelcomeAnimation({ userName }: WelcomeAnimationProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Start fade in animation
    setTimeout(() => setVisible(true), 100)
  }, [])

  return (
    <div className="flex items-center justify-center min-h-screen p-6 bg-gradient-to-br from-primary via-accent to-primary">
      <div
        className={`text-center transition-all duration-1000 ${
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        <h1 className="text-5xl md:text-6xl font-bold text-primary-foreground mb-4 animate-fade-in text-balance">
          Seja bem-vindo ao
        </h1>
        <h2 className="text-6xl md:text-7xl font-bold text-primary-foreground/95 animate-fade-in text-balance">
          FinanPro
        </h2>
        <p className="text-xl md:text-2xl text-primary-foreground/80 mt-6 animate-fade-in">Olá, {userName}!</p>
      </div>
    </div>
  )
}
