# Babel Fish - Real-Time Browser Audio Translation Extension

Transform your browsing experience with real-time audio translation. Babel Fish captures audio from any browser tab and displays live translations in a customizable overlay.

## Features

- **Real-Time Translation**: Translate audio from any website (YouTube, podcasts, video calls, etc.)
- **Multi-Language Support**: English, Japanese, and Chinese
- **Customizable Overlay**: Resize and reposition the translation display to your preference
- **Persistent Settings**: Your language preferences and overlay settings are saved automatically
- **Low Latency**: < 500ms average translation delay for smooth real-time experience
- **Ad-Supported**: Free to use with non-intrusive advertisements

## Installation

### From Chrome Web Store (Recommended)
1. Visit the [Babel Fish Chrome Web Store page](https://chrome.google.com/webstore)
2. Click "Add to Chrome"
3. Confirm the installation by clicking "Add Extension"

### From Source (Development)
1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/babel-fish.git
   cd babel-fish/extension
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Load in Chrome:
   - Open Chrome and navigate to `chrome://extensions`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `extension/dist` folder

## Quick Start

1. **Select Languages**
   - Click the Babel Fish icon in your browser toolbar
   - Choose your source language (the language being spoken)
   - Choose your target language (the language you want to see)
   - Languages must be different

2. **Start Translation**
   - Click "Start Translation" in the popup
   - Grant microphone/audio permissions when prompted
   - The translation overlay will appear on your current tab

3. **Customize the Overlay**
   - **Resize**: Drag any corner or edge of the overlay
   - **Reposition**: Drag the header bar to move the overlay
   - Your preferences are saved automatically

4. **Stop Translation**
   - Click the X button in the overlay header, or
   - Click the Babel Fish icon and click "Stop Translation"

## Supported Languages

| Language | Code | Direction |
|----------|------|-----------|
| English  | en   | Source ↔ Target |
| Japanese | ja   | Source ↔ Target |
| Chinese  | zh   | Source ↔ Target |

## Usage Tips

- **Best Performance**: Use on websites with clear audio (minimize background noise)
- **Overlay Position**: Position the overlay where it won't block important content
- **Size Constraints**: Overlay can be resized between 200-800px wide and 100-600px tall
- **Persistence**: Your overlay size and position persist across browser sessions

## Troubleshooting

### Translation not starting
- **Check Permissions**: Ensure you've granted audio capture permissions
- **Language Selection**: Verify source and target languages are different
- **Network**: Ensure you have a stable internet connection
- **Tab Audio**: Make sure the tab has active audio (play a video or audio)

### Connection Timeout
- If you see "Connection timeout" after 5 seconds:
  - Check your internet connection
  - Try refreshing the page
  - Click "Retry" in the notification banner

### No audio being captured
- Chrome requires the tab to have audio playback
- Try playing a video or audio file first
- Check that the tab isn't muted

### Overlay not visible
- The overlay appears only when translation is active
- Check that translation has started (green indicator in popup)
- Try repositioning - it may be off-screen

### Ads not appearing
- Ad blockers may prevent ads from loading
- Translation will work normally even if ads fail to load
- Consider disabling ad blockers for this extension to support development

## Performance

- **Bundle Size**: ~358 KB (optimized for fast loading)
- **Memory Usage**: < 50 MB typical
- **Latency**: < 500ms P50 (average delay from audio to translation)
- **Compatibility**: Chrome 90+, works on 95% of websites

## Privacy

- **Audio Processing**: Audio is sent to our translation server for processing
- **No Recording**: Audio is not stored or recorded
- **No PII**: We do not collect personally identifiable information
- **Settings**: Language preferences stored locally in your browser only

For full privacy policy, visit [Privacy Policy](https://your-website.com/privacy)

## Development

### Commands
```bash
# Install dependencies
npm install

# Build for production
npm run build

# Run tests
npm test

# Run linting
npm run lint

# Run all checks
npm test && npm run lint
```

### Project Structure
```
extension/
├── src/
│   ├── components/       # React UI components
│   ├── services/         # WebSocket, audio capture, ads
│   ├── hooks/           # React hooks
│   ├── types/           # TypeScript definitions
│   ├── utils/           # Utility functions
│   └── styles/          # Tailwind CSS
├── tests/
│   ├── unit/            # Jest unit tests
│   ├── integration/     # Integration tests
│   └── e2e/             # Playwright E2E tests
├── public/              # Static assets
└── dist/                # Built extension (generated)
```

### Tech Stack
- **Framework**: React 18 + TypeScript 5.0
- **Styling**: Tailwind CSS 3
- **Build**: Webpack 5
- **Testing**: Jest + Playwright
- **Platform**: Chrome Extension Manifest V3

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

## Support

- **Issues**: Report bugs at [GitHub Issues](https://github.com/your-org/babel-fish/issues)
- **Questions**: Ask in [Discussions](https://github.com/your-org/babel-fish/discussions)
- **Email**: support@babel-fish.com

## License

MIT License - see [LICENSE](../LICENSE) for details

## Acknowledgments

Built with the Claude Agent SDK and powered by real-time translation AI.

---

**Version**: 1.0.0
**Last Updated**: 2025-12-07
