package expo.modules.lumixllm

import androidx.core.os.bundleOf
import com.google.mediapipe.tasks.genai.llminference.LlmInference
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class LumixLlmModule : Module() {
  private var llmInference: LlmInference? = null

  override fun definition() = ModuleDefinition {
    Name("LumixLLM")

    Events("LumixLLMToken", "LumixLLMDone", "LumixLLMError")

    // Load the model from an absolute file path.
    // The result listener is wired at init time (MediaPipe 0.10.14+ API).
    AsyncFunction("load") { modelPath: String, maxTokens: Int, temperature: Double ->
      val context = requireNotNull(appContext.reactContext) { "React context unavailable" }
      llmInference?.close()
      val options = LlmInference.LlmInferenceOptions.builder()
        .setModelPath(modelPath)
        .setMaxTokens(maxTokens)
        .build()
      llmInference = LlmInference.createFromOptions(context, options)
    }

    // Fire-and-forget: starts async generation; results arrive via LumixLLMToken/Done/Error events.
    Function("generate") { prompt: String ->
      val inference = llmInference ?: run {
        sendEvent("LumixLLMError", bundleOf("message" to "Model not loaded — call load() first"))
        return@Function
      }
      try {
        inference.generateResponseAsync(prompt) { partialResult: String?, done: Boolean ->
          if (partialResult != null) {
            sendEvent("LumixLLMToken", bundleOf("text" to partialResult))
          }
          if (done) {
            sendEvent("LumixLLMDone", bundleOf())
          }
        }
      } catch (e: Exception) {
        sendEvent("LumixLLMError", bundleOf("message" to (e.message ?: "Unknown error during generation")))
      }
    }

    Function("stop") {
      // LlmInference has no mid-generation cancel API; no-op for now.
    }

    Function("unload") {
      llmInference?.close()
      llmInference = null
    }
  }
}
