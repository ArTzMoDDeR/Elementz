// Proxy for Google IMA SDK.
// AppLixir dynamically loads imasdk.googleapis.com which gets blocked by ad blockers.
// We intercept document.createElement to redirect that URL to this proxy.
import { NextResponse } from 'next/server'

const IMA_CDN = 'https://imasdk.googleapis.com/js/sdkloader/ima3.js'

let cachedScript: string | null = null
let cachedAt = 0
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

export async function GET() {
  try {
    const now = Date.now()
    if (!cachedScript || now - cachedAt > CACHE_TTL) {
      const res = await fetch(IMA_CDN, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Vercel/1.0)',
          'Referer': 'https://elementz.fun/',
        },
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`IMA CDN responded ${res.status}`)
      cachedScript = await res.text()
      cachedAt = now
    }

    return new NextResponse(cachedScript, {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err) {
    cachedScript = null
    cachedAt = 0
    // Return a minimal IMA stub so AppLixir doesn't crash when IMA is unavailable
    return new NextResponse(
      `var google=window.google||{};google.ima={VERSION:"3.0",AdDisplayContainer:function(){return{initialize:function(){},destroy:function(){}}},AdsLoader:function(){return{addEventListener:function(){},requestAds:function(){},contentComplete:function(){},destroy:function(){}}},AdsRequest:function(){return{}},AdsManagerLoadedEvent:{Type:{ADS_MANAGER_LOADED:"adsManagerLoaded"}},AdErrorEvent:{Type:{AD_ERROR:"adError"}},AdEvent:{Type:{CONTENT_PAUSE_REQUESTED:"contentPauseRequested",CONTENT_RESUME_REQUESTED:"contentResumeRequested",ALL_ADS_COMPLETED:"allAdsCompleted",COMPLETE:"complete"}},ImaSdkSettings:{CompanionBackfillMode:{ALWAYS:"always"}},settings:{setDisableCustomPlaybackForIOS10Plus:function(){},setLocale:function(){},setNumRedirects:function(){},setPlayerType:function(){},setPlayerVersion:function(){}},UiElements:{AD_ATTRIBUTION:"adAttribution",COUNTDOWN:"countdown"}};`,
      {
        status: 200,
        headers: {
          'Content-Type': 'application/javascript; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      }
    )
  }
}
