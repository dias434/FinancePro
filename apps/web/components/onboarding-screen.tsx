"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronRight, TrendingUp, Target, PieChart } from "lucide-react"

interface OnboardingScreenProps {
  onComplete: () => void
}

const onboardingSteps = [
  {
    icon: TrendingUp,
    title: "Controle Total das suas Finanças",
    description: "Acompanhe todas as suas entradas e saídas de forma simples e organizada.",
  },
  {
    icon: Target,
    title: "Alcance suas Metas",
    description: "Defina objetivos financeiros e receba recomendações personalizadas para conquistá-los.",
  },
  {
    icon: PieChart,
    title: "Relatórios Inteligentes",
    description: "Visualize relatórios detalhados e tome decisões financeiras mais assertivas.",
  },
]

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [currentStep, setCurrentStep] = useState(0)

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onComplete()
    }
  }

  const step = onboardingSteps[currentStep]
  const Icon = step.icon

  return (
    <div className="flex flex-col items-center justify-between min-h-screen p-6 text-center">
      <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto">
        <div className="mb-8 p-6 rounded-full bg-gradient-to-br from-primary to-accent animate-fade-in">
          <Icon className="w-16 h-16 text-primary-foreground" />
        </div>

        <h1 className="text-3xl font-bold mb-4 text-balance animate-fade-in">{step.title}</h1>

        <p className="text-lg text-muted-foreground mb-8 animate-fade-in text-balance">{step.description}</p>
      </div>

      <div className="w-full max-w-md">
        <div className="flex gap-2 justify-center mb-6">
          {onboardingSteps.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentStep ? "w-8 bg-primary" : "w-2 bg-border"
              }`}
            />
          ))}
        </div>

        <Button onClick={handleNext} size="lg" className="w-full text-lg">
          {currentStep < onboardingSteps.length - 1 ? "Continuar" : "Começar"}
          <ChevronRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </div>
  )
}
