export function ThemeOverride() {
  return (
    <style jsx global>{`
      /* Force black backgrounds everywhere */
      body,
      html,
      #__next,
      main,
      aside,
      div[class*="bg-"],
      div[class*="rounded-lg"] {
        background-color: #000000 !important;
      }
      
      /* Override any blue/slate/indigo backgrounds */
      [class*="bg-blue"],
      [class*="bg-slate"],
      [class*="bg-indigo"],
      [class*="bg-gray-9"],
      [class*="bg-zinc-9"] {
        background-color: #000000 !important;
      }
      
      /* Ensure cards are black with white borders */
      .border {
        border-color: rgba(255, 255, 255, 0.1) !important;
      }
      
      /* Remove blue tints from cards */
      div[class*="p-6"][class*="rounded-lg"] {
        background-color: #000000 !important;
      }
    `}</style>
  )
}