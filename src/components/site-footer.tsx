export function SiteFooter() {
  return (
    <footer className="border-grid border-t py-2 md:py-0">
      <div className="container-wrapper">
        <div className="container pt-2">
          <div className="text-balance text-center text-sm leading-loose text-muted-foreground md:text-left">
            Built by{" "}
            <a
              href="https://github.com/flashlab"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-4"
            >
              flashlab
            </a>
            . The source code is available on{" "}
            <a
              href="https://github.com/flashlab/motion-live-photo"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-4"
            >
              GitHub
            </a>
            .
          </div>
        </div>
      </div>
    </footer>
  )
}