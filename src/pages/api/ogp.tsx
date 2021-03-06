/* eslint-disable security/detect-non-literal-fs-filename, unicorn/prefer-node-protocol */

import fs from "fs";
import path from "path";
import type { NextApiRequest, NextApiResponse } from "next";
import * as chromium from "playwright-aws-lambda";
import ReactDomServer from "react-dom/server";
import { OgpTemplate } from "~/components/ogp";
import type { OgpInfo } from "~/components/ogp";

const baseFullPath = path.resolve("./")
const iconPath = path.join(baseFullPath, "public/rintaro.webp");
const icon: string = fs.readFileSync(iconPath, "base64");
const monopath = path.join(baseFullPath, "public/fonts/RobotoMono-Medium.woff2");
const mono = fs.readFileSync(monopath).toString("base64");
const notopath = path.join(baseFullPath, "public/fonts/NotoSansJp-Bold.woff2");
const noto = fs.readFileSync(notopath).toString("base64");
const style = `
@font-face {
  font-family: "Noto Sans JP";
  font-style: normal;
  font-weight: bold;
  src: url(data:font/woff2;charset=utf-8;base64,${noto}) format("woff2");
  font-display: swap;
}
@font-face {
  font-family: "Roboto Mono";
  font-style: normal;
  font-weight: 500;
  src: url(data:font/woff2;charset=utf-8;base64,${mono}) format("woff2");
  font-display: swap;
}
* {
  margin: 0;
  padding: 0;
}
html,
body {
  width: 100%;
  height: 100%;
  background: #2e3440;
  font-family: "Noto Sans JP", sans-serif;
  font-size: 125%;
  color: #d8dee9;
}
body {
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(to right bottom, #b48ead, #81a1c1);
}
#Wrapper {
  margin: 50px;
  background: white;
  grid-gap: 30px;
  border-radius: 30px;
  background: #2e3440;
  box-shadow: 10px 10px 20px rgba(28, 25, 33, 0.4),
    -10px -10px 20px rgba(28, 25, 33, 0.4);
  padding: 50px;
  display: grid;
  grid-template-rows: 280px 100px;
  grid-template-columns: 700px 250px;
  grid-template-areas: "Title Title" "Name Date";
}
#Wrapper #Title {
  font-size: 60px;
  grid-area: Title;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}
#Wrapper #Title p {
  max-height: 100%;
  overflow-wrap: anywhere;
}
#Wrapper #Name {
  grid-area: Name;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 20px;
}
#Wrapper #Name img {
  margin-right: 20px;
  border-radius: 50%;
}
#Wrapper #Date {
  grid-area: Date;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  font-family: "Roboto Mono", monospace;
}
`;

// eslint-disable-next-line max-statements
const Ogp = async (request: NextApiRequest, response: NextApiResponse) => {
  try {
    const playwrightArguments = {
      development: {
        args: chromium.getChromiumArgs(false),
        executablePath: "/opt/google/chrome/google-chrome",
        headless: true,
      },
      production: {
        args: chromium.getChromiumArgs(true),
      },
      test: {},
    }[process.env.NODE_ENV];
    const viewport = { height: 630, width: 1200 };
    const browser = await chromium.launchChromium(playwrightArguments);
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await page.setExtraHTTPHeaders({
      "Accept-Language": "ja-JP",
    });
    const title = request.query.title ?? "";
    const date = request.query.date ?? "";
    const ogpinfo: OgpInfo = {
      date: date.toString(),
      icon,
      style,
      title: title.toString(),
    };
    const markup = ReactDomServer.renderToStaticMarkup(<OgpTemplate {...ogpinfo} />);
    const html = `<!doctype html>${markup}`;
    await page.setContent(html, { waitUntil: "networkidle" });
    const image = await page.screenshot({ type: "png" });
    await browser.close();
    response.setHeader("Cache-Control", "s-maxage=5256000, stale-while-revalidate");
    response.setHeader("Content-Type", "image/png");
    response.end(image);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[Error]:", error);
    response.status(500).send("Internal Server Error");
  }
};

export default Ogp;

/* eslint-enable */
