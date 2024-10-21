#!/usr/bin/env bun

import type { Message } from "ollama"
import { Ollama } from "ollama"

const ORGANIZER_MODEL = "llama3.2:3b"
const MODELS = ["llama3.2:3b", "llama3.2:3b"]

const ollama = new Ollama()

const GRAY = Bun.color("gray", "ansi")
const GREEN = Bun.color("green", "ansi")
const BRIGHT_MAGENTA = "\x1b[95m"
const BOLD_CYAN = "\x1b[36;1m"
const RESET = "\x1b[0m"

const SEPARATOR = GRAY + "-".repeat(30) + RESET

const ITERATION = 10

function printPrefix(content: string) {
  console.write(`${BRIGHT_MAGENTA}${content}${RESET} ${BOLD_CYAN}=>${RESET} `)
}

async function sendChat(name: string, model: string, history: Message[]): Promise<string> {
  const res = await ollama.chat({
    stream: true,
    model,
    messages: history,
  })

  printPrefix(name)

  let text = ""

  for await (const chunk of res) {
    const word = chunk.message.content
    console.write(word)
    text += word
  }

  console.log()
  return text
}

async function main() {
  console.write("> ")

  let prompt = ""

  for await (const line of console) {
    prompt += `${line}\n`
    break
  }

  console.log(SEPARATOR)
  printPrefix("You")
  console.log(prompt)

  // Meeting organizer
  console.log(SEPARATOR)
  const organizerResponse = await sendChat("Organizer", ORGANIZER_MODEL, [
    {
      role: "system",
      content: "You are an AI meeting organizer. The user will give you a topic to be discussed, and you start the meeting by introducing the topic to fellow AIs.",
    },
    {
      role: "user",
      content: `Topic: ${prompt}`,
    },
  ])

  const messageGroups = MODELS.map((_, i) => [
    {
      role: "system",
      content: `You are participating an AI meeting with another AI. You are Participant ${i + 1}. The meeting organizer AI will introduce you the topic, you discuss the topic with another AI.`,
    },
    {
      role: "user",
      content: `Organizer: ${organizerResponse}`,
    },
  ] satisfies Message[])

  let sender: string | undefined = undefined
  let lastResponse = organizerResponse

  // Participants
  for (let i = 0; i < ITERATION; i++) {
    const aiNo = i % MODELS.length
    console.log(SEPARATOR)
    console.log(`${GREEN}Iteration ${i + 1}${RESET}`)

    if (sender) {
      messageGroups[aiNo].push({
        role: "user",
        content: `${sender}: ${lastResponse}`,
      })
    }

    sender = `Participant ${aiNo + 1}`
    lastResponse = await sendChat(sender, MODELS[aiNo], messageGroups[aiNo])

    messageGroups[aiNo].push({
      role: "assistant",
      content: lastResponse,
    })
  }

  console.log(SEPARATOR)
}

await main()
