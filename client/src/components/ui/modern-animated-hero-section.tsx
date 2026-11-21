"use client"

import type React from "react"
import { useState, useEffect, useCallback, useRef } from "react"

interface Character {
  char: string
  x: number
  y: number
  speed: number
}

class TextScramble {
  el: HTMLElement
  chars: string
  queue: Array<{
    from: string
    to: string
    start: number
    end: number
    char?: string
  }>
  frame: number
  frameRequest: number
  resolve: (value: void | PromiseLike<void>) => void

  constructor(el: HTMLElement) {
    this.el = el
    this.chars = '!<>-_\\/[]{}—=+*^?#'
    this.queue = []
    this.frame = 0
    this.frameRequest = 0
    this.resolve = () => {}
    this.update = this.update.bind(this)
  }

  setText(newText: string) {
    const oldText = this.el.innerText
    const length = Math.max(oldText.length, newText.length)
    const promise = new Promise<void>((resolve) => this.resolve = resolve)
    this.queue = []
    
    for (let i = 0; i < length; i++) {
      const from = oldText[i] || ''
      const to = newText[i] || ''
      const start = Math.floor(Math.random() * 40)
      const end = start + Math.floor(Math.random() * 40)
      this.queue.push({ from, to, start, end })
    }
    
    cancelAnimationFrame(this.frameRequest)
    this.frame = 0
    this.update()
    return promise
  }

  update() {
    let output = ''
    let complete = 0
    
    for (let i = 0, n = this.queue.length; i < n; i++) {
      let { from, to, start, end, char } = this.queue[i]
      if (this.frame >= end) {
        complete++
        output += to
      } else if (this.frame >= start) {
        if (!char || Math.random() < 0.28) {
          char = this.chars[Math.floor(Math.random() * this.chars.length)]
          this.queue[i].char = char
        }
        output += `<span class="dud">${char}</span>`
      } else {
        output += from
      }
    }
    
    this.el.innerHTML = output
    if (complete === this.queue.length) {
      this.resolve()
    } else {
      this.frameRequest = requestAnimationFrame(this.update)
      this.frame++
    }
  }
}

export interface ScrambledTitleProps {
  phrases?: string[]
  className?: string
  style?: React.CSSProperties
}

const DEFAULT_PHRASES = [
  'SKILLDUELS ARENA',
  '1V1 CODE COMBAT',
  'REAL-TIME CS TRIVIA',
  'PROVE YOUR KNOWLEDGE',
  'CLIMB TO CONQUEROR',
  'ENTER THE ARENA'
]

export const ScrambledTitle: React.FC<ScrambledTitleProps> = ({
  phrases = DEFAULT_PHRASES,
  className = "",
  style = {},
}) => {
  const elementRef = useRef<HTMLHeadingElement>(null)
  const scramblerRef = useRef<TextScramble | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (elementRef.current && !scramblerRef.current) {
      scramblerRef.current = new TextScramble(elementRef.current)
      setMounted(true)
    }
  }, [])

  useEffect(() => {
    if (mounted && scramblerRef.current) {
      let counter = 0
      let timerId: ReturnType<typeof setTimeout>

      const next = () => {
        if (scramblerRef.current) {
          scramblerRef.current.setText(phrases[counter]).then(() => {
            timerId = setTimeout(next, 2000)
          })
          counter = (counter + 1) % phrases.length
        }
      }

      next()

      return () => {
        if (timerId) clearTimeout(timerId)
      }
    }
  }, [mounted, phrases])

  return (
    <h1 
      ref={elementRef}
      className={`text-white text-4xl sm:text-6xl font-bold tracking-wider justify-center text-center select-none ${className}`}
      style={{ fontFamily: 'monospace', textShadow: '0 0 20px rgba(99,102,241,0.6)', ...style }}
    >
      {phrases[0] || 'SKILLDUELS ARENA'}
    </h1>
  )
}

export interface RainingLettersProps {
  phrases?: string[]
  charCount?: number
  glowColor?: string
  className?: string
  style?: React.CSSProperties
  overlay?: boolean
  showTitle?: boolean
}

export const RainingLetters: React.FC<RainingLettersProps> = ({
  phrases,
  charCount = 300,
  glowColor = "#10b981",
  className = "",
  style = {},
  overlay = false,
  showTitle = true,
}) => {
  const [characters, setCharacters] = useState<Character[]>([])
  const [activeIndices, setActiveIndices] = useState<Set<number>>(new Set())

  const createCharacters = useCallback(() => {
    const allChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?"
    const newCharacters: Character[] = []

    for (let i = 0; i < charCount; i++) {
      newCharacters.push({
        char: allChars[Math.floor(Math.random() * allChars.length)],
        x: Math.random() * 100,
        y: Math.random() * 100,
        speed: 0.1 + Math.random() * 0.3,
      })
    }

    return newCharacters
  }, [charCount])

  useEffect(() => {
    setCharacters(createCharacters())
  }, [createCharacters])

  useEffect(() => {
    if (characters.length === 0) return

    const updateActiveIndices = () => {
      const newActiveIndices = new Set<number>()
      const numActive = Math.floor(Math.random() * 3) + 3
      for (let i = 0; i < numActive; i++) {
        newActiveIndices.add(Math.floor(Math.random() * characters.length))
      }
      setActiveIndices(newActiveIndices)
    }

    const flickerInterval = setInterval(updateActiveIndices, 50)
    return () => clearInterval(flickerInterval)
  }, [characters.length])

  useEffect(() => {
    let animationFrameId: number

    const updatePositions = () => {
      setCharacters(prevChars => 
        prevChars.map(char => ({
          ...char,
          y: char.y + char.speed,
          ...(char.y >= 100 && {
            y: -5,
            x: Math.random() * 100,
            char: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?"[
              Math.floor(Math.random() * "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?".length)
            ],
          }),
        }))
      )
      animationFrameId = requestAnimationFrame(updatePositions)
    }

    animationFrameId = requestAnimationFrame(updatePositions)
    return () => cancelAnimationFrame(animationFrameId)
  }, [])

  return (
    <div
      className={`relative w-full h-full overflow-hidden ${overlay ? 'bg-transparent' : 'bg-black'} ${className}`}
      style={{ minHeight: '100%', ...style }}
    >
      {/* Title */}
      {showTitle && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none px-4 w-full max-w-4xl">
          <ScrambledTitle phrases={phrases} />
        </div>
      )}

      {/* Raining Characters */}
      {characters.map((char, index) => {
        const isActive = activeIndices.has(index)
        return (
          <span
            key={index}
            className={`absolute select-none pointer-events-none transition-colors duration-100 ${
              isActive
                ? "z-10 font-bold animate-pulse"
                : "text-slate-600 font-light"
            }`}
            style={{
              left: `${char.x}%`,
              top: `${char.y}%`,
              color: isActive ? glowColor : 'rgba(100, 116, 139, 0.45)',
              transform: `translate(-50%, -50%) ${isActive ? 'scale(1.25)' : 'scale(1)'}`,
              textShadow: isActive 
                ? `0 0 8px ${glowColor}, 0 0 16px ${glowColor}` 
                : 'none',
              opacity: isActive ? 1 : 0.35,
              transition: 'color 0.1s, transform 0.1s, text-shadow 0.1s',
              willChange: 'transform, top',
              fontSize: '1.4rem',
              fontFamily: 'monospace',
            }}
          >
            {char.char}
          </span>
        )
      })}

      <style>{`
        .dud {
          color: ${glowColor};
          opacity: 0.75;
          text-shadow: 0 0 8px ${glowColor};
        }
      `}</style>
    </div>
  )
}

export default RainingLetters
