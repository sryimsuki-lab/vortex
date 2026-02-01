import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Home from './page';

// Mock fetch globally
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = (function () {
  let store: Record<string, string> = {};
  return {
    getItem: function (key: string) {
      return store[key] || null;
    },
    setItem: function (key: string, value: string) {
      store[key] = value.toString();
    },
    clear: function () {
      store = {};
    },
  };
})();
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock ResizeObserver (needed for Framer Motion sometimes)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('Vortex Frontend', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
    window.localStorage.clear();
  });

  it('renders the branding correctly', () => {
    render(<Home />);
    expect(screen.getByText('Vortex')).toBeInTheDocument();
    expect(screen.getByText(/Private Media Downloader/i)).toBeInTheDocument();
  });

  it('handles user input correctly', () => {
    render(<Home />);
    
    const urlInput = screen.getByPlaceholderText(/Paste media URL here/i);
    const keyInput = screen.getByPlaceholderText(/Access Key/i);

    fireEvent.change(urlInput, { target: { value: 'https://youtube.com/watch?v=123' } });
    fireEvent.change(keyInput, { target: { value: 'secret123' } });

    expect(urlInput).toHaveValue('https://youtube.com/watch?v=123');
    expect(keyInput).toHaveValue('secret123');
  });

  it('submits the form and handles success', async () => {
    // Mock successful API response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'success',
        title: 'Funny Cat Video',
        download_url: '/files/cat.mp4',
      }),
    });

    render(<Home />);
    
    const urlInput = screen.getByPlaceholderText(/Paste media URL here/i);
    const keyInput = screen.getByPlaceholderText(/Access Key/i);
    const button = screen.getByRole('button', { name: /Vortex It/i });

    fireEvent.change(urlInput, { target: { value: 'https://example.com/video' } });
    fireEvent.change(keyInput, { target: { value: 'mykey' } });
    
    fireEvent.click(button);

    // Button should change to "Pulling..."
    expect(screen.getByText(/Pulling.../i)).toBeInTheDocument();

    await waitFor(() => {
      // Success state
      expect(screen.getByText('Funny Cat Video')).toBeInTheDocument();
      expect(screen.getByText('Ready to Download')).toBeInTheDocument();
    });

    // Verify API call
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/yoink'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-Access-Key': 'mykey',
        }),
        body: JSON.stringify({ url: 'https://example.com/video' }),
      })
    );
  });

  it('displays error message on failure', async () => {
    // Mock failed API response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ detail: 'Invalid URL' }),
    });

    render(<Home />);
    
    const urlInput = screen.getByPlaceholderText(/Paste media URL here/i);
    const button = screen.getByRole('button', { name: /Vortex It/i });

    fireEvent.change(urlInput, { target: { value: 'https://valid-format-but-fails.com' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Invalid URL')).toBeInTheDocument();
    });
  });
});
