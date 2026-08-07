import type { Metadata, Viewport } from "next";
import "./globals.css";
const siteUrl="https://mindmeal-mvp-zh.cckmike.chatgpt.site";
export const metadata:Metadata={metadataBase:new URL(siteUrl),title:"MindMeal 有意食｜飲食導航 MVP",description:"拍下這一餐，看懂今天還差什麼。MindMeal 有意食互動式 MVP。",openGraph:{title:"MindMeal 有意食｜飲食導航 MVP",description:"拍下這一餐，看懂今天還差什麼。",url:siteUrl,type:"website",images:[{url:`${siteUrl}/og.png`,width:1728,height:912,alt:"MindMeal 有意食飲食導航 MVP"}]},twitter:{card:"summary_large_image",title:"MindMeal 有意食｜飲食導航 MVP",description:"拍下這一餐，看懂今天還差什麼。",images:[`${siteUrl}/og.png`]}};
export const viewport:Viewport={width:"device-width",initialScale:1,themeColor:"#F7F7F5"};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="zh-Hant"><body>{children}</body></html>}
