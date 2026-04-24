package expo.modules.lumixllm

import android.util.Log
import androidx.core.os.bundleOf
import com.google.ai.edge.litertlm.Backend
import com.google.ai.edge.litertlm.Contents
import com.google.ai.edge.litertlm.Conversation
import com.google.ai.edge.litertlm.ConversationConfig
import com.google.ai.edge.litertlm.Engine
import com.google.ai.edge.litertlm.EngineConfig
import com.google.ai.edge.litertlm.Message
import com.google.ai.edge.litertlm.MessageCallback
import com.google.ai.edge.litertlm.SamplerConfig
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.sse.EventSource
import okhttp3.sse.EventSourceListener
import okhttp3.sse.EventSources
import org.json.JSONArray
import org.json.JSONObject
import android.app.ActivityManager
import android.content.Context
import java.io.File
import java.util.concurrent.TimeUnit

private const val TAG = "LumixLLM"

class LumixLlmModule : Module() {
  private var engine: Engine? = null
  private var conversation: Conversation? = null
  private var staticSystemPrompt: String = ""
  private var isGenerating = false

  // Dedicated client for Lumen SSE — readTimeout(0) keeps the stream open indefinitely
  private val lumenClient = OkHttpClient.Builder()
    .readTimeout(0, TimeUnit.MILLISECONDS)
    .build()
  private var lumenEventSource: EventSource? = null

  /**
   * Tries to create the Engine with GPU first; if that throws falls back to CPU.
   * A hard crash inside the GPU driver won't be catchable — but a Java-level
   * exception (unsupported model format, driver init error) will be caught here.
   */
  private fun tryCreateEngine(
    modelPath: String,
    availMb: Long,
    activityManager: ActivityManager?,
    memInfo: ActivityManager.MemoryInfo,
  ): Engine {
    // GPU attempt
    try {
      Log.i(TAG, "load: creating Engine with GPU backend")
      val config = EngineConfig(modelPath = modelPath, backend = Backend.GPU())
      val eng = Engine(config)
      val availAfterMb = run {
        activityManager?.getMemoryInfo(memInfo)
        memInfo.availMem / (1024 * 1024)
      }
      Log.i(TAG, "load: Engine(GPU) OK — RAM delta=${availMb - availAfterMb} MB consumed")
      return eng
    } catch (gpuErr: Throwable) {
      Log.w(TAG, "load: GPU backend FAILED: ${gpuErr::class.simpleName}: ${gpuErr.message} — retrying with CPU")
    }

    // CPU fallback
    try {
      Log.i(TAG, "load: creating Engine with CPU backend (fallback)")
      val config = EngineConfig(modelPath = modelPath, backend = Backend.CPU())
      val eng = Engine(config)
      Log.i(TAG, "load: Engine(CPU) OK")
      return eng
    } catch (cpuErr: Throwable) {
      Log.e(TAG, "load: CPU backend ALSO FAILED: ${cpuErr::class.simpleName}: ${cpuErr.message}", cpuErr)
      throw cpuErr
    }
  }

  // Creates (or recreates) the Conversation using the stored static system prompt.
  // Called at load time and whenever the user starts a new session.
  private fun openConversation(eng: Engine) {
    Log.d(TAG, "openConversation: closing previous conversation if any")
    conversation?.close()

    Log.d(TAG, "openConversation: creating ConversationConfig (systemPrompt length=${staticSystemPrompt.length})")
    val config = ConversationConfig(
      systemInstruction = Contents.of(staticSystemPrompt),
      samplerConfig = SamplerConfig(topK = 40, topP = 0.95, temperature = 0.7),
    )

    Log.d(TAG, "openConversation: calling engine.createConversation()")
    conversation = eng.createConversation(config)
    Log.d(TAG, "openConversation: conversation created OK")
  }

  override fun definition() = ModuleDefinition {
    Name("LumixLLM")

    Events(
      "LumixLLMToken", "LumixLLMDone", "LumixLLMError",
      "LumixLumenToken", "LumixLumenDone", "LumixLumenError",
    )

    // ── Local model ───────────────────────────────────────────────────────────

    AsyncFunction("load") { modelPath: String, systemPrompt: String ->
      Log.i(TAG, "load: called with modelPath='$modelPath'")
      Log.i(TAG, "load: systemPrompt length=${systemPrompt.length}")

      // ── 1. File sanity checks ─────────────────────────────────────────────
      val modelFile = File(modelPath)
      Log.i(TAG, "load: file exists=${modelFile.exists()}, isFile=${modelFile.isFile}, readable=${modelFile.canRead()}")
      if (modelFile.exists()) {
        val sizeMb = modelFile.length() / (1024 * 1024)
        Log.i(TAG, "load: file size=${sizeMb} MB")
      } else {
        Log.e(TAG, "load: MODEL FILE NOT FOUND at '$modelPath' — aborting")
        throw IllegalArgumentException("Model file not found: $modelPath")
      }

      // ── 2. Tear down any previous instance ───────────────────────────────
      Log.d(TAG, "load: closing previous conversation/engine if present")
      conversation?.close()
      conversation = null
      engine?.close()
      engine = null
      isGenerating = false

      staticSystemPrompt = systemPrompt

      // ── 3. Log available memory then create Engine ────────────────────────
      val activityManager = appContext.reactContext
        ?.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
      val memInfo = ActivityManager.MemoryInfo()
      activityManager?.getMemoryInfo(memInfo)
      val availMb = memInfo.availMem / (1024 * 1024)
      val totalMb = memInfo.totalMem / (1024 * 1024)
      val isLowMemory = memInfo.lowMemory
      Log.i(TAG, "load: RAM — available=${availMb} MB / total=${totalMb} MB, lowMemory=$isLowMemory")
      Log.i(TAG, "load: JVM heap — free=${Runtime.getRuntime().freeMemory() / 1048576} MB / max=${Runtime.getRuntime().maxMemory() / 1048576} MB")

      // ── 3a. Try GPU backend, fall back to CPU if it throws ───────────────
      Log.i(TAG, "load: attempting GPU backend first")
      val eng: Engine = tryCreateEngine(modelPath, availMb, activityManager, memInfo)

      // ── 4. Initialize ─────────────────────────────────────────────────────
      Log.i(TAG, "load: calling engine.initialize()")
      try {
        eng.initialize()
        Log.i(TAG, "load: engine.initialize() returned OK")
      } catch (e: Throwable) {
        Log.e(TAG, "load: engine.initialize() THREW: ${e::class.simpleName}: ${e.message}", e)
        eng.close()
        throw e
      }

      engine = eng

      // ── 5. Open Conversation ──────────────────────────────────────────────
      Log.i(TAG, "load: opening conversation")
      try {
        openConversation(eng)
        Log.i(TAG, "load: COMPLETE — engine + conversation ready")
      } catch (e: Throwable) {
        Log.e(TAG, "load: openConversation() THREW: ${e::class.simpleName}: ${e.message}", e)
        throw e
      }
    }

    Function("generate") { userMessage: String, dynamicContext: String ->
      Log.d(TAG, "generate: userMessage length=${userMessage.length}, dynamicContext length=${dynamicContext.length}")

      val conv = conversation ?: run {
        Log.e(TAG, "generate: conversation is null — model not loaded")
        sendEvent("LumixLLMError", bundleOf("message" to "Model not loaded — call load() first"))
        return@Function
      }

      if (isGenerating) {
        Log.w(TAG, "generate: already generating, ignoring call")
        sendEvent("LumixLLMError", bundleOf("message" to "Already generating"))
        return@Function
      }

      isGenerating = true

      val fullMessage = if (dynamicContext.isNotBlank())
        "$dynamicContext\n\n---\n\n$userMessage"
      else
        userMessage

      Log.d(TAG, "generate: sending message (total length=${fullMessage.length})")

      try {
        conv.sendMessageAsync(fullMessage, object : MessageCallback {
          override fun onMessage(message: Message) {
            val token = message.toString()
            if (token.isNotEmpty()) {
              sendEvent("LumixLLMToken", bundleOf("text" to token))
            }
          }

          override fun onDone() {
            Log.d(TAG, "generate: onDone()")
            isGenerating = false
            sendEvent("LumixLLMDone", bundleOf())
          }

          override fun onError(t: Throwable) {
            Log.e(TAG, "generate: onError: ${t::class.simpleName}: ${t.message}", t)
            isGenerating = false
            engine?.let { openConversation(it) }
            sendEvent("LumixLLMError", bundleOf("message" to (t.message ?: "Unknown error")))
          }
        })
      } catch (e: Exception) {
        Log.e(TAG, "generate: sendMessageAsync threw: ${e::class.simpleName}: ${e.message}", e)
        isGenerating = false
        sendEvent("LumixLLMError", bundleOf("message" to (e.message ?: "Unknown error")))
      }
    }

    Function("stop") {
      Log.d(TAG, "stop: called (no-op — LiteRT-LM has no mid-generation cancel yet)")
    }

    Function("resetConversation") {
      Log.i(TAG, "resetConversation: resetting conversation state")
      isGenerating = false
      engine?.let { openConversation(it) }
    }

    Function("unload") {
      Log.i(TAG, "unload: closing conversation and engine")
      isGenerating = false
      conversation?.close()
      conversation = null
      engine?.close()
      engine = null
      staticSystemPrompt = ""
      Log.i(TAG, "unload: done")
    }

    // ── Lumen Mode (OpenRouter native SSE) ───────────────────────────────────

    Function("lumenGenerate") { messagesJson: String, model: String, apiKey: String, temperature: Double, maxTokens: Int ->
      Log.d(TAG, "lumenGenerate: model=$model, maxTokens=$maxTokens, temperature=$temperature")
      lumenEventSource?.cancel()

      val bodyJson = JSONObject().apply {
        put("model", model)
        put("messages", JSONArray(messagesJson))
        put("stream", true)
        put("temperature", temperature)
        put("max_tokens", maxTokens)
      }.toString()

      val request = Request.Builder()
        .url("https://openrouter.ai/api/v1/chat/completions")
        .post(bodyJson.toRequestBody("application/json".toMediaType()))
        .addHeader("Authorization", "Bearer $apiKey")
        .addHeader("HTTP-Referer", "https://lumix.ai")
        .addHeader("X-Title", "LUMIX")
        .build()

      lumenEventSource = EventSources.createFactory(lumenClient)
        .newEventSource(request, object : EventSourceListener() {
          override fun onEvent(
            eventSource: EventSource,
            id: String?,
            type: String?,
            data: String,
          ) {
            if (data == "[DONE]") {
              sendEvent("LumixLumenDone", bundleOf())
              return
            }
            try {
              val token = JSONObject(data)
                .getJSONArray("choices")
                .getJSONObject(0)
                .getJSONObject("delta")
                .optString("content", "")
              if (token.isNotEmpty()) {
                sendEvent("LumixLumenToken", bundleOf("text" to token))
              }
            } catch (_: Exception) {
              // skip malformed SSE lines
            }
          }

          override fun onFailure(
            eventSource: EventSource,
            t: Throwable?,
            response: okhttp3.Response?,
          ) {
            val msg = t?.message ?: response?.let { "HTTP ${it.code}" } ?: "Unknown error"
            Log.e(TAG, "lumenGenerate: SSE failure: $msg", t)
            sendEvent("LumixLumenError", bundleOf("message" to msg))
          }

          override fun onClosed(eventSource: EventSource) {
            sendEvent("LumixLumenDone", bundleOf())
          }
        })
    }

    Function("lumenStop") {
      lumenEventSource?.cancel()
      lumenEventSource = null
    }
  }
}
