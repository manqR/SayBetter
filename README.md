# SayBetter

An intelligent English writing assistant powered by Google's Gemini AI. SayBetter helps you improve your English sentences by detecting mixed Indonesian-English text, correcting grammar, and providing professional and casual variations.

## Features

- **Smart Language Detection**: Automatically detects and translates mixed Indonesian + English sentences
- **Grammar Correction**: Fixes grammar issues and improves sentence clarity
- **Multiple Variations**: Provides three versions of your text:
  - **Corrected**: Neutral, clear, and grammatically correct
  - **Professional**: Formal, business-appropriate language
  - **Casual**: Relaxed, conversational tone
- **Local History**: All data stored locally in browser using IndexedDB
- **Clean UI**: Modern, responsive interface built with Tailwind CSS v4 and shadcn/ui

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) with Turbopack
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) (Radix UI primitives)
- **AI**: Google Gemini API (`gemini-flash-latest`)
- **Storage**: IndexedDB via [idb](https://github.com/jakearchibald/idb)
- **Icons**: [Lucide React](https://lucide.dev/)

## Prerequisites

- Node.js 20+ installed
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd saybetter
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

1. **Enter your text**: Type or paste your sentence in the textarea (can be Indonesian, English, or mixed)
2. **Click "Improve"**: The AI will process your text
3. **View results**: See three variations:
   - Corrected version
   - Professional (formal) version
   - Casual (conversational) version
4. **History**: Your corrections are automatically saved in browser storage

### Example

**Input**: 
```
jadi saya tidak perlu melakukan apapun if not using region US-EAST-1 ?
```

**Output**:
- **Corrected**: So I don't need to do anything if I'm not using the US-EAST-1 region?
- **Professional**: Therefore, no action is required on my part if I am not utilizing the US-EAST-1 region?
- **Casual**: So I don't have to do anything if I'm not using the US-EAST-1 region, right?

## Project Structure

```
saybetter/
├── app/
│   ├── api/
│   │   └── gemini/
│   │       └── route.ts      # Gemini API endpoint
│   ├── globals.css           # Global styles (Tailwind v4)
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Main application page
├── components/
│   └── ui/                   # shadcn/ui components
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       ├── scroll-area.tsx
│       ├── select.tsx
│       ├── separator.tsx
│       └── textarea.tsx
├── lib/
│   ├── db.ts                 # IndexedDB utilities
│   └── utils.ts              # Helper functions
├── public/                   # Static assets
├── .env.local               # Environment variables (not in git)
├── next.config.ts           # Next.js configuration
├── tailwind.config.ts       # Tailwind configuration
└── package.json             # Dependencies
```

## API Endpoint

### POST `/api/gemini`

**Request Body**:
```json
{
  "message": "your text here",
  "model": "gemini-flash-latest"
}
```

**Response**:
```json
{
  "reply": "Corrected:\n...\n\nProfessional:\n...\n\nCasual:\n..."
}
```

**Error Response**:
```json
{
  "reply": "❌ Gemini API Error (404): ..."
}
```

## Available Scripts

```bash
# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Your Google Gemini API key | Yes |

## Troubleshooting

### "API key is not set" error
- Check that `.env.local` exists in the root directory
- Verify `GEMINI_API_KEY` is set correctly
- Restart the dev server after adding the key

### "Model not found" error
- The model name may have changed. Current supported model: `gemini-flash-latest`
- Check [Google AI documentation](https://ai.google.dev/models/gemini) for latest model names

### UI not styled correctly
- This project uses **Tailwind CSS v4**
- Ensure `globals.css` contains: `@import "tailwindcss";`
- Clear `.next` folder and restart: `rm -rf .next && npm run dev`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is private and proprietary.

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Powered by [Google Gemini AI](https://ai.google.dev/)
