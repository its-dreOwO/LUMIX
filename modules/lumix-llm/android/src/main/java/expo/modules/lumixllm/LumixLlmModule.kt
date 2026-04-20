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
    // modelPath: absolute path to the .task file on device storage
    // maxTokens: max tokens to generate per response
    // temperature: sampling temperature (0.0–1.0)
    AsyncFunction("load") { modelPath: String, maxTokens: Int, temperature: Double ->
      val context = requireNotNull(appContext.reactContext) { "React context unavailable" }
      val options = LlmInference.LlmInferenceOptions.builder()
        .setModelPath(modelPath)
        .setMaxTokens(maxTokens)
        .setTemperature(temperature.toFloat())
        .build()
      llmInference?.close()
      llmInference = LlmInference.createFromOptions(context, options)
    }

    // Fire-and-forget: starts async generation and emits token events.
    // Results arrive via LumixLLMToken / LumixLLMDone / LumixLLMError events.
    Function("generate") { prompt: String ->
      val inference = llmInference ?: run {
        sendEvent("LumixLLMError", bundleOf("message" to "Model not loaded — call load() first"))
        return@Function
      }
      try {
        inference.generateResponseAsync(prompt) { partialResult, done ->
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

    // No cancel API in LlmInference — generation runs to completion naturally.
    Function("stop") {
      // no-op for now; close/reload would cancel but is expensive
    }
  }
}
