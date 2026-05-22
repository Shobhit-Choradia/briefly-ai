import React, { useState, useEffect } from 'react';
import
{
  FileText,
  Sparkles,
  Copy,
  Check,
  Settings,
  AlertTriangle,
  Trash2,
  Clock,
  TrendingDown,
  Sliders,
  Cpu,
  ExternalLink,
  BookOpen
} from 'lucide-react';

const EXAMPLES = [
  {
    title: "Artificial Intelligence",
    text: "Artificial intelligence (AI) is intelligence demonstrated by machines, as opposed to the natural intelligence displayed by animals including humans. AI research has been defined as the field of study of intelligent agents, which refers to any system that perceives its environment and takes actions that maximize its chance of achieving its goals. The term 'artificial intelligence' had previously been used to describe machines that mimic and display human cognitive skills, such as learning and problem-solving, but this definition is rejected by major AI researchers. AI applications include advanced web search engines, recommendation systems, understanding human speech, self-driving cars, generative tools, and competing at the highest level in strategic games. As machines become increasingly capable, tasks considered to require 'intelligence' are often removed from the definition of AI, a phenomenon known as the AI effect."
  },
  {
    title: "History of Spaceflight",
    text: "The history of spaceflight began in the 20th century with theoretical and practical breakthroughs in rocket propulsion. After World War II, the United States and the Soviet Union entered a geopolitical rivalry known as the Cold War, which led to the Space Race. In October 1957, the Soviet Union launched Sputnik 1, the first artificial satellite to orbit Earth. This event shocked the Western world and triggered intense technological competition. In April 1961, Soviet cosmonaut Yuri Gagarin became the first human to fly in space, orbiting Earth. In July 1969, the United States achieved the first manned moon landing with Apollo 11, where Neil Armstrong and Buzz Aldrin walked on the lunar surface. Since the end of the Space Race, space exploration has transitioned to a more collaborative international effort, exemplified by the construction and operation of the International Space Station (ISS)."
  },
  {
    title: "Photosynthesis",
    text: "Photosynthesis is a biological process used by plants, algae, and certain bacteria to convert light energy into chemical energy. This chemical energy is stored in organic compounds, such as sugars, which can later be released to fuel the organisms' metabolic activities. The process is crucial for life on Earth as it is the primary source of oxygen in the atmosphere and forms the base of most food chains. Photosynthesis generally takes place in cell organelles called chloroplasts, which contain pigment molecules called chlorophyll. During the light-dependent reactions, chlorophyll absorbs solar radiation, which is used to split water molecules, generating oxygen gas and chemical energy carriers. In the light-independent reactions (the Calvin cycle), these energy carriers are used to fix carbon dioxide from the air into glucose, providing nourishment for the plant."
  }
];

const BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:8000"
  : "https://intrainmode-briefly-ai-api.hf.space";

function App ()
{
  const [ inputText, setInputText ] = useState( "" );
  const [ minLength, setMinLength ] = useState( 30 );
  const [ maxLength, setMaxLength ] = useState( 130 );
  const [ isLoading, setIsLoading ] = useState( false );
  const [ loadingStep, setLoadingStep ] = useState( "" );
  const [ summaryResult, setSummaryResult ] = useState( null );
  const [ copied, setCopied ] = useState( false );
  const [ error, setError ] = useState( "" );
  const [ backendStatus, setBackendStatus ] = useState( "checking" ); // "checking", "online", "offline"

  // Tokenization states for ChatGPT-style colorized tokens
  const [ activeTab, setActiveTab ] = useState( "editor" ); // "editor" or "tokenizer"
  const [ tokenCount, setTokenCount ] = useState( 0 );
  const [ tokensList, setTokensList ] = useState( [] );
  const [ isTokenizing, setIsTokenizing ] = useState( false );
  const [ hoveredToken, setHoveredToken ] = useState( null );

  // Quick stats computed on the fly
  const charCount = inputText.length;
  const wordCount = inputText.trim() === "" ? 0 : inputText.trim().split( /\s+/ ).length;
  const estReadTime = Math.ceil( wordCount / 200 ); // 200 WPM average
  const isTooLong = tokenCount > 1024;

  // Debounce input to query tokenizer API
  useEffect( () =>
  {
    if ( !inputText.trim() )
    {
      setTokenCount( 0 );
      setTokensList( [] );
      return;
    }

    const delayDebounceFn = setTimeout( async () =>
    {
      setIsTokenizing( true );
      try
      {
        const response = await fetch( `${ BASE_URL }/api/tokenize`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify( { text: inputText } )
        } );
        if ( response.ok )
        {
          const data = await response.json();
          setTokenCount( data.token_count );
          setTokensList( data.tokens );
        }
      } catch ( err )
      {
        console.error( "Tokenization API failed:", err );
      } finally
      {
        setIsTokenizing( false );
      }
    }, 350 ); // 350ms debounce

    return () => clearTimeout( delayDebounceFn );
  }, [ inputText ] );

  // Check backend health on load
  useEffect( () =>
  {
    const checkHealth = async () =>
    {
      try
      {
        const response = await fetch( `${ BASE_URL }/api/health` );
        if ( response.ok )
        {
          const data = await response.json();
          setBackendStatus( data.status === "healthy" ? "online" : "offline" );
        } else
        {
          setBackendStatus( "offline" );
        }
      } catch ( err )
      {
        setBackendStatus( "offline" );
      }
    };
    checkHealth();
    // Poll health status every 10 seconds
    const interval = setInterval( checkHealth, 10000 );
    return () => clearInterval( interval );
  }, [] );

  const handleSummarize = async ( e ) =>
  {
    e.preventDefault();
    if ( tokenCount < 10 )
    {
      setError( "Please input at least 10 tokens for a meaningful summary." );
      return;
    }

    setError( "" );
    setIsLoading( true );
    setSummaryResult( null );

    // Multi-step loading simulation for extra visual premium feedback
    setLoadingStep( "Connecting to API..." );

    setTimeout( () =>
    {
      setLoadingStep( "Processing natural language tokens..." );
    }, 800 );

    setTimeout( () =>
    {
      setLoadingStep( "Generating distilled summary via DistilBART..." );
    }, 1800 );

    try
    {
      const response = await fetch( `${ BASE_URL }/api/summarize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify( {
          text: inputText,
          min_length: minLength,
          max_length: maxLength
        } )
      } );

      if ( !response.ok )
      {
        const errData = await response.json();
        throw new Error( errData.detail || "Failed to generate summary from the server." );
      }

      const data = await response.json();
      setSummaryResult( data );
    } catch ( err )
    {
      setError( err.message || "An unexpected error occurred during communication." );
    } finally
    {
      setIsLoading( false );
      setLoadingStep( "" );
    }
  };

  const handleSummarizeDetailed = async ( e ) =>
  {
    e.preventDefault();
    if ( tokenCount < 10 )
    {
      setError( "Please input at least 10 tokens for a meaningful summary." );
      return;
    }

    setError( "" );
    setIsLoading( true );
    setSummaryResult( null );

    setLoadingStep( "Connecting to Deep NLP Suite..." );

    setTimeout( () =>
    {
      setLoadingStep( "Analyzing text tone and core style..." );
    }, 800 );

    setTimeout( () =>
    {
      setLoadingStep( "Running Named Entity Recognition (NER)..." );
    }, 1800 );

    setTimeout( () =>
    {
      setLoadingStep( "Extracting high-impact keyphrases..." );
    }, 2800 );

    setTimeout( () =>
    {
      setLoadingStep( "Synthesizing final summaries..." );
    }, 3800 );

    try
    {
      const response = await fetch( `${ BASE_URL }/api/summarize-detailed`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify( {
          text: inputText,
          min_length: minLength,
          max_length: maxLength
        } )
      } );

      if ( !response.ok )
      {
        const errData = await response.json();
        throw new Error( errData.detail || "Failed to generate detailed analysis from the server." );
      }

      const data = await response.json();
      setSummaryResult( data );
    } catch ( err )
    {
      setError( err.message || "An unexpected error occurred during communication." );
    } finally
    {
      setIsLoading( false );
      setLoadingStep( "" );
    }
  };

  const handleCopy = () =>
  {
    if ( !summaryResult ) return;
    navigator.clipboard.writeText( summaryResult.summary );
    setCopied( true );
    setTimeout( () => setCopied( false ), 2000 );
  };

  const handleClear = () =>
  {
    setInputText( "" );
    setSummaryResult( null );
    setError( "" );
  };

  const loadExample = ( text ) =>
  {
    setInputText( text );
    setError( "" );
  };

  return (
    <div className="app-container">
      <header>
        <div className="badge">
          <span className={`dot ${ backendStatus === 'online' ? '' : 'offline' }`} style={{
            backgroundColor: backendStatus === 'online' ? '#10b981' : backendStatus === 'checking' ? '#f59e0b' : '#ef4444',
            boxShadow: backendStatus === 'online' ? '0 0 10px #10b981' : backendStatus === 'checking' ? '0 0 10px #f59e0b' : '0 0 10px #ef4444'
          }}></span>
          API Status: {backendStatus === "online" ? "Active" : backendStatus === "checking" ? "Checking" : "Offline"}
        </div>
        <h1>Briefly AI</h1>
        <p className="subtitle">
          Condense lengthy articles, notes, and documents instantly into readable, highly accurate summaries powered by a lightweight local DistilBART model.
        </p>
      </header>

      {error && (
        <div className="error-banner">
          <AlertTriangle size={20} />
          <div>{error}</div>
        </div>
      )}

      <div className="dashboard-grid">
        {/* Input Control Section */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="section-title" style={{ marginBottom: 0 }}>
              <FileText size={20} />
              <h2>Source Text</h2>
            </div>
            
            {/* Tabs Selector */}
            <div className="tabs-header">
              <button 
                className={`tab-btn ${activeTab === 'editor' ? 'active' : ''}`}
                onClick={() => setActiveTab('editor')}
                type="button"
              >
                <FileText size={14} />
                Editor
              </button>
              <button 
                className={`tab-btn ${activeTab === 'tokenizer' ? 'active' : ''}`}
                onClick={() => setActiveTab('tokenizer')}
                type="button"
              >
                <Sparkles size={14} />
                Token Visualizer
              </button>
            </div>
          </div>

          {activeTab === 'editor' ? (
            <>
              <div className="textarea-container">
                <textarea
                  placeholder="Paste your long article or document here (minimum 10 tokens)..."
                  value={inputText}
                  onChange={( e ) =>
                  {
                    setInputText( e.target.value );
                    if ( error ) setError( "" );
                  }}
                  style={{
                    borderColor: isTooLong ? '#ef4444' : '',
                    boxShadow: isTooLong ? '0 0 15px -3px rgba(239, 68, 68, 0.25)' : ''
                  }}
                />
                <div className="textarea-stats">
                  <span style={{
                    color: isTooLong ? '#f87171' : 'var(--text-muted)',
                    fontWeight: isTooLong ? '700' : '500'
                  }}>
                    {wordCount} words | {tokenCount} / 1024 tokens
                  </span>
                  <span>{charCount} characters</span>
                  {wordCount > 0 && <span>~{estReadTime} min read</span>}
                </div>
                {isTooLong && (
                  <div className="error-banner" style={{ marginTop: '1rem', marginBottom: 0, padding: '0.75rem 1.25rem', borderRadius: '12px' }}>
                    <AlertTriangle size={16} />
                    <div style={{ fontSize: '0.85rem' }}>
                      Text exceeds maximum limit of 1024 tokens. Please shorten your input to preserve summary completeness.
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Examples Section */}
              <div style={{ marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Load Example Passage:
                </span>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {EXAMPLES.map( ( example, idx ) => (
                    <button
                      key={idx}
                      onClick={() => loadExample( example.text )}
                      className="action-btn"
                      type="button"
                    >
                      <BookOpen size={13} />
                      {example.title}
                    </button>
                  ) )}
                </div>
              </div>

              {/* Configuration Settings */}
              <div className="controls-card">
                <div className="section-title" style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>
                  <Sliders size={18} />
                  <h3>Summarization Limits</h3>
                </div>

                <div className="slider-group">
                  <div className="slider-label">
                    <span>Minimum Summary Length</span>
                    <span className="value">{minLength} tokens</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="150"
                    value={minLength}
                    onChange={( e ) =>
                    {
                      const val = parseInt( e.target.value );
                      setMinLength( val );
                      if ( val >= maxLength )
                      {
                        setMaxLength( val + 10 );
                      }
                    }}
                  />
                </div>

                <div className="slider-group">
                  <div className="slider-label">
                    <span>Maximum Summary Length</span>
                    <span className="value">{maxLength} tokens</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="400"
                    value={maxLength}
                    onChange={( e ) =>
                    {
                      const val = parseInt( e.target.value );
                      setMaxLength( val );
                      if ( val <= minLength )
                      {
                        setMinLength( Math.max( 5, val - 10 ) );
                      }
                    }}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Tokenizer tab visualization */}
              <div className="token-container">
                {isTokenizing && tokensList.length === 0 ? (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', flexDirection: 'column', gap: '1rem' }}>
                    <div className="spinner" style={{ width: '40px', height: '40px' }}></div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Analyzing tokens...</span>
                  </div>
                ) : tokensList.length > 0 ? (
                  tokensList.map( ( token, idx ) => (
                    <span
                      key={idx}
                      className={`token-span token-c${token.color_index} ${hoveredToken?.index === idx ? 'hovered' : ''}`}
                      onMouseEnter={() => setHoveredToken( { ...token, index: idx } )}
                      onMouseLeave={() => setHoveredToken( null )}
                    >
                      {token.text}
                    </span>
                  ) )
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', marginTop: '6rem' }}>
                    No tokens found. Start typing in the Editor tab to visualize tokens here!
                  </div>
                )}
              </div>

              {/* Hover inspector status bar */}
              <div className="token-inspector">
                {hoveredToken ? (
                  <>
                    <div>
                      <span className="token-inspector-label">Token Text:</span>{" "}
                      <span className="token-inspector-value highlight" style={{ whiteSpace: 'pre' }}>
                        {hoveredToken.text === "\n" ? "\\n (Newline)" : hoveredToken.text === " " ? "(Space)" : hoveredToken.text}
                      </span>
                    </div>
                    <div>
                      <span className="token-inspector-label">Token ID:</span>{" "}
                      <span className="token-inspector-value">{hoveredToken.id}</span>
                    </div>
                    <div>
                      <span className="token-inspector-label">Index:</span>{" "}
                      <span className="token-inspector-value">{hoveredToken.index}</span>
                    </div>
                  </>
                ) : (
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Hover over any token block above to inspect its metadata.
                  </span>
                )}
              </div>

              <div style={{ marginTop: '1rem', marginBottom: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                💡 <strong>About BART Tokenization:</strong> The DistilBART model partitions natural language into "tokens" (sub-words or full words). A single word often spans multiple tokens. The maximum API capacity is strictly <strong>1024 tokens</strong>.
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: '1rem' }}>
            {inputText && (
              <button onClick={handleClear} className="action-btn" style={{ padding: '1.1rem', marginTop: '1.5rem', borderRadius: '16px', justifyContent: 'center' }}>
                <Trash2 size={18} />
              </button>
            )}
            <button
              onClick={handleSummarize}
              disabled={isLoading || tokenCount < 10 || isTooLong || backendStatus !== 'online'}
              className="btn-primary"
              style={{ flex: 1 }}
            >
              <Sparkles size={18} />
              {isLoading ? "Generating..." : "Generate Summary"}
            </button>
            <button
              onClick={handleSummarizeDetailed}
              disabled={isLoading || tokenCount < 10 || isTooLong || backendStatus !== 'online'}
              className="btn-primary"
              style={{ flex: 1 }}
            >
              <Sparkles size={18} />
              {isLoading ? "Generating..." : "Generate Detailed Summary"}
            </button>
          </div>
        </div>

        {/* Output Panel Section */}
        <div className="glass-card">
          {isLoading ? (
            <div className="loading-wrapper">
              <div className="spinner"></div>
              <div className="loading-steps">
                <div className="loading-text">{loadingStep}</div>
                <div className="loading-subtext">Executing HuggingFace pipelines. This might take 1-3 seconds.</div>
              </div>
            </div>
          ) : summaryResult ? (
            <div>
              <div className="output-header">
                <div className="output-title">
                  <Sparkles size={20} />
                  <h2>Summarized Output</h2>
                </div>
                <button
                  onClick={handleCopy}
                  className={`action-btn ${ copied ? 'success' : '' }`}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? "Copied!" : "Copy Summary"}
                </button>
              </div>

              <div className="summary-text-box">
                {summaryResult.summary}
              </div>

              <div className="section-title" style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
                <TrendingDown size={18} style={{ color: 'var(--primary-pink)' }} />
                <h3>Efficiency Metrics</h3>
              </div>

              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-val highlight">-{summaryResult.percentage_reduction}%</div>
                  <div className="stat-label">Reduction</div>
                </div>
                <div className="stat-item">
                  <div className="stat-val">{summaryResult.summary_length_words}</div>
                  <div className="stat-label">Words Output</div>
                </div>
                <div className="stat-item">
                  <div className="stat-val">{summaryResult.time_taken_seconds}s</div>
                  <div className="stat-label">Response Time</div>
                </div>
              </div>

              <div className="model-info-footer">
                <span>Model Engine:</span>
                <span className="model-name-badge">
                  <Cpu size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                  {summaryResult.summarization_model_used || summaryResult.model_used}
                </span>
              </div>

              {/* Advanced NLP Deep Analysis Cards */}
              {summaryResult.entities_found && (
                <div style={{ marginTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.5rem' }}>
                  {/* Tone Analysis Gauge */}
                  <div className="section-title" style={{ fontSize: '1.1rem', marginBottom: '0.8rem' }}>
                    <Sparkles size={18} style={{ color: '#f472b6' }} />
                    <h3>Text Tone Analysis</h3>
                  </div>
                  <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                    <span className="tone-badge" style={{
                      padding: '0.4rem 1rem',
                      borderRadius: '20px',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(99, 102, 241, 0.15) 100%)',
                      border: '1px solid rgba(236, 72, 153, 0.3)',
                      color: '#f472b6',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 0 15px rgba(236, 72, 153, 0.1)'
                    }}>
                      🎭 Dominant Tone: {summaryResult.tone}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Engine: {summaryResult.tone_model_used}
                    </span>
                  </div>

                  {/* Named Entities Card */}
                  <div className="section-title" style={{ fontSize: '1.1rem', marginBottom: '0.8rem' }}>
                    <BookOpen size={18} style={{ color: '#38bdf8' }} />
                    <h3>Entities & Key Subjects</h3>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                    {summaryResult.entities_found.length > 0 ? (
                      summaryResult.entities_found.map( ( ent, idx ) => (
                        <span key={idx} className="concept-tag" style={{
                          padding: '0.35rem 0.75rem',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          background: 'rgba(56, 189, 248, 0.08)',
                          border: '1px solid rgba(56, 189, 248, 0.2)',
                          color: '#38bdf8',
                          fontWeight: '500'
                        }}>
                          🔍 {ent}
                        </span>
                      ) )
                    ) : (
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No major entities discovered.</span>
                    )}
                  </div>

                  {/* Extracted Keyphrases Card */}
                  <div className="section-title" style={{ fontSize: '1.1rem', marginBottom: '0.8rem' }}>
                    <FileText size={18} style={{ color: '#a78bfa' }} />
                    <h3>Core Keyphrases & Tags</h3>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                    {summaryResult.keywords.length > 0 ? (
                      summaryResult.keywords.map( ( kw, idx ) => (
                        <span key={idx} className="concept-tag" style={{
                          padding: '0.35rem 0.75rem',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          background: 'rgba(167, 139, 250, 0.08)',
                          border: '1px solid rgba(167, 139, 250, 0.2)',
                          color: '#a78bfa',
                          fontWeight: '500'
                        }}>
                          # {kw}
                        </span>
                      ) )
                    ) : (
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No high-impact keyphrases extracted.</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Sparkles />
              </div>
              <div>
                <h3 className="empty-state-title">Awaiting Your Input</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  Input some text in the left panel and click 'Generate Summary' to see it compiled here with visual analysis.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
