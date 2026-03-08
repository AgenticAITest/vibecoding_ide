# Voice-Activated Enterprise Login

**Feature Pack v1.0.0** | React Native (Expo) | On-Device AI

FunctionGemma 270M local inference + Speech-to-Text for voice-activated login.

## Constraints — What NOT to change

- **LLM Bridge:** Use ONLY `expo-llm-mediapipe`. Do not substitute with any other library.
- **STT Engine:** Use ONLY `@react-native-voice/voice`. Do not use `expo-speech`, WebSpeech API, or Whisper.
- **Temperature:** Model temperature MUST be `0.1`. Do not increase — it prevents hallucinated function names.
- **System Prompt Format:** MUST follow: `Functions: [names]. User says: [transcript]`. Do not reformat.
- **Model Filename:** MUST be `function_gemma_270m_it.task` (case-sensitive). Must be in `/assets/` folder.
- **No External APIs:** Do NOT call any external API. All voice + AI processing is fully local/on-device. This is the core enterprise privacy requirement.

## Prerequisites — Manual Steps Before Coding

These steps cannot be vibe-coded. Do them manually first:

1. **Download model file from HuggingFace**
   - Repo: `sasha-denisov/function-gemma-270M-it`
   - File: `function_gemma_270m_it.task`

2. **Place model file at `/assets/function_gemma_270m_it.task`**
   - If `/assets/` folder doesn't exist, create it at project root.

3. **Run install commands in terminal:**

```bash
# Install AI bridge (on-device LLM)
npx expo install expo-llm-mediapipe

# Install Speech-to-Text engine
npx expo install @react-native-voice/voice
```

## File Map — Where to Apply Changes

| Path | Action |
|------|--------|
| `/assets/function_gemma_270m_it.task` | PLACE FILE (manual download) |
| `/screens/LoginScreen.tsx` | REPLACE CONTENTS with code below |
| `/package.json` | AUTO-UPDATED by `npx expo install` |

If your login screen has a different filename, use that path. The component name (`EnterpriseLogin`) should be kept.

## Implementation — Complete Login Screen Code

```tsx
import React, { useState, useEffect } from 'react';
import { View, TextInput, Button, TouchableOpacity, Text } from 'react-native';
import { useLLM } from 'expo-llm-mediapipe';
import Voice from '@react-native-voice/voice';

// --- VIBE CONFIG ---
// CUSTOMIZE these values per deployment environment
const ENTERPRISE_USER = 'enterprise_admin';   // <-- CHANGE THIS
const ENTERPRISE_PASS = 'secure_pass_2026';   // <-- CHANGE THIS
// DO NOT change anything below unless instructed

const EnterpriseLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [listening, setListening] = useState(false);

  // STEP 1: Local AI setup
  // DO NOT CHANGE: model name must match /assets/ file exactly
  // DO NOT CHANGE: temperature must stay at 0.1
  const llm = useLLM({
    modelName: 'function_gemma_270m_it.task',
    maxTokens: 50,
    temperature: 0.1,
  });

  // STEP 2: Voice recognition listeners
  useEffect(() => {
    Voice.onSpeechResults = (e) => {
      if (e.value) {
        setListening(false);
        handleVibeCommand(e.value[0]);
      }
    };
    Voice.onSpeechError = () => setListening(false);
    return () => Voice.destroy().then(Voice.removeAllListeners);
  }, []);

  // STEP 3: Vibe command handler
  // DO NOT CHANGE: systemPrompt structure controls function detection
  const handleVibeCommand = async (transcript) => {
    const systemPrompt =
      `Functions: fill_credentials(), clear_form(). User says: "${transcript}"`;

    const response = await llm.generateResponse(systemPrompt);

    if (response.includes('fill_credentials')) {
      setUsername(ENTERPRISE_USER);
      setPassword(ENTERPRISE_PASS);
    } else if (response.includes('clear_form')) {
      setUsername('');
      setPassword('');
    }
  };

  // STEP 4: UI
  return (
    <View style={{ padding: 20 }}>
      <TextInput
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        style={{ borderBottomWidth: 1, marginBottom: 10 }}
      />
      <TextInput
        placeholder="Password"
        value={password}
        secureTextEntry
        onChangeText={setPassword}
        style={{ borderBottomWidth: 1, marginBottom: 20 }}
      />

      {/* VIBE TRIGGER: Mic button -- DO NOT remove or rename onPress handler */}
      <TouchableOpacity
        onPress={() => { setListening(true); Voice.start('en-US'); }}
        style={{
          backgroundColor: listening ? '#e53935' : '#1976d2',
          padding: 14, borderRadius: 50, alignItems: 'center'
        }}
      >
        <Text style={{ color: '#fff', fontSize: 22 }}>
          {listening ? 'Listening...' : 'Login, Please'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default EnterpriseLogin;
```

### Customizable Lines

| Line | What to Change |
|------|---------------|
| `ENTERPRISE_USER` | Set your pre-defined username |
| `ENTERPRISE_PASS` | Set your pre-defined password |
| `Voice.start('en-US')` | Change locale if needed (e.g., `'es-ES'`) |

## Acceptance Criteria — Definition of Done

- [ ] Mic button is visible on the login screen
- [ ] Tapping mic button starts listening (button turns red)
- [ ] Saying "login please" fills both username and password fields
- [ ] Saying "clear form" empties both fields
- [ ] No network requests are made during voice or AI processing
- [ ] App works fully offline after initial install
- [ ] Credentials are NOT stored in plaintext anywhere except the config constants

## Flutter Status

Flutter does not have a clean equivalent for this feature:

- **speech_to_text** (pub.dev) — equivalent to `@react-native-voice/voice`, mature and stable
- **On-device LLM** — No `expo-llm-mediapipe` equivalent. Options: `flutter_tflite` (complex) or `google_generative_ai` SDK (requires network). Neither matches this exact pattern.
- **Function-calling pattern** — No clean framework-level equivalent yet. Requires manual string parsing.

**Recommendation:** Complete this feature in React Native (Expo) first. Revisit Flutter implementation when `google_generative_ai` adds on-device function-calling support.
