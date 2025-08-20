import { t } from "i18next";

export function SiteFooter() {
  return (
    <footer className="border-grid border-t py-2 md:py-0">
      <div className="container-wrapper">
        <div className="container pt-2">
          <div className="text-balance text-center text-sm leading-loose text-muted-foreground md:text-left">
            🌱 Source at{" "}
            <a

              rel="noreferrer"
              className="font-medium underline underline-offset-4"
            >
              Godx. 摄之社俱乐部
            </a>
            . Source at{" "}
            <a
              href="https://szs.show/"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-4"
            >
              szs.show
            </a>
            .
          </div>
        </div>
      </div>
    </footer>
  )
}