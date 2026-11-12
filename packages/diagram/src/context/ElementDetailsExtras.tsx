import { type PropsWithChildren, type ReactNode, createContext, useContext } from 'react'

/**
 * The element whose details are shown: its id, the node it was opened from, if any, and its title
 */
export type ElementDetailsSubject = {
  id: string
  nodeId: string | null
  title: string
}

/**
 * What an app that embeds a diagram adds to an element's details:
 * `actions`, drawn at the right of the kind and tags.
 */
export type ElementDetailsExtras = {
  actions?: (element: ElementDetailsSubject) => ReactNode
}

const ElementDetailsExtrasContext = createContext<ElementDetailsExtras | null>(null)

/**
 * Provider for what an app adds to element details
 *
 * @example
 * ```tsx
 * <ElementDetailsExtrasProvider value={{ actions: ({ id }) => <Button onClick={() => open(id)}>Open</Button> }}>
 *   <LikeC4Diagram />
 * </ElementDetailsExtrasProvider>
 * ```
 */
export function ElementDetailsExtrasProvider({
  value,
  children,
}: PropsWithChildren<{ value: ElementDetailsExtras | null }>) {
  return (
    <ElementDetailsExtrasContext.Provider value={value}>
      {children}
    </ElementDetailsExtrasContext.Provider>
  )
}

export function useElementDetailsExtras(): ElementDetailsExtras | null {
  return useContext(ElementDetailsExtrasContext)
}
