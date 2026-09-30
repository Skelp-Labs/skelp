const formatTool = ({ name, args }) => {
  if (!args || typeof args !== 'object') return name || 'unknown'
  const details = Object.entries(args)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(' ')
  return details ? `${name || 'unknown'} ${details}` : name || 'unknown'
}

export function createProgressRenderer ({ write, ansi, now = () => performance.now() }) {
  let stepStartedAt = null
  let currentStep = null
  let progressInterval = null
  const renderActiveStep = () => {
    if (stepStartedAt === null) return
    const elapsed = (now() - stepStartedAt) / 1000
    write(`\r${ansi.dim}⏳ Step ${currentStep + 1}... ${elapsed.toFixed(2)}s${ansi.reset}`)
  }
  const completeStep = (step) => {
    if (stepStartedAt === null) return
    clearInterval(progressInterval)
    progressInterval = null
    const elapsed = (now() - stepStartedAt) / 1000
    write(`\r${ansi.green}✅ Step ${step + 1} completed in ${elapsed.toFixed(2)}s${ansi.reset}\n`)
    stepStartedAt = null
  }

  return {
    markdownStream: null,
    start: () => {},
    stream: () => {},
    toolCall: ({ name, step, args }) => {
      currentStep = step
      write(`${ansi.dim}  Tool: ${formatTool({ name, args })}${ansi.reset}\n`)
    },
    toolResult: () => {},
    chunk: () => {},
    beforeStep: ({ step }) => {
      if (stepStartedAt !== null) completeStep(step - 1)
      currentStep = step
      stepStartedAt = now()
      renderActiveStep()
      progressInterval = setInterval(renderActiveStep, 100)
    },
    step: () => {},
    end: () => {
      if (stepStartedAt !== null) completeStep(currentStep)
    }
  }
}
