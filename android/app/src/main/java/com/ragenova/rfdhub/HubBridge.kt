package com.ragenova.rfdhub

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.webkit.JavascriptInterface
import org.json.JSONObject

class HubBridge(private val context: Context) {

    private val prefs = context.getSharedPreferences("rfd_hub", Context.MODE_PRIVATE)

    @JavascriptInterface
    fun getConfig(): String {
        val obj = JSONObject()
        obj.put("apiBase", prefs.getString("apiBase", "http://185.45.149.198:50201") ?: "")
        obj.put("rfdPath", prefs.getString("rfdPath", "") ?: "")
        return obj.toString()
    }

    @JavascriptInterface
    fun setConfig(partialJson: String): String {
        return try {
            val partial = JSONObject(partialJson)
            val editor = prefs.edit()
            if (partial.has("apiBase")) {
                editor.putString("apiBase", partial.getString("apiBase"))
            }
            if (partial.has("rfdPath")) {
                editor.putString("rfdPath", partial.getString("rfdPath"))
            }
            editor.apply()
            getConfig()
        } catch (e: Exception) {
            JSONObject().apply {
                put("ok", false)
                put("error", e.message ?: "invalid config")
            }.toString()
        }
    }

    @JavascriptInterface
    fun launchRfd(payloadJson: String): String {
        // Honest result: Windows RFD.exe cannot run on Android.
        return JSONObject().apply {
            put("ok", false)
            put("error", "Launching the Windows RFD player is not supported on Android.")
        }.toString()
    }

    @JavascriptInterface
    fun openExternal(url: String) {
        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(intent)
        } catch (_: Exception) {
            // ignore
        }
    }
}
