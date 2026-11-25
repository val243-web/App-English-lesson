import React, { Component, ErrorInfo, ReactNode, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { BADGES, evaluateUnlockedBadges } from '../src/data/badges';
import { LEVELS } from '../src/data/curriculum';
import { DICTIONARY_ENTRIES } from '../src/data/dictionary';
import {
  AccentMode,
  DictionaryEntry,
  LevelPart,
  PartId,
  StoryDefinition,
  StoryId,
  UserProgress,
} from '../src/types/learning';
import { fetchNewDiscoveryWordsBatch, fetchOnlineWord } from '../src/utils/onlineDictionary';
import {
  calculateStars,
  getDefaultProgress,
  isPartUnlocked,
  isStoryUnlocked,
} from '../src/utils/storage';

SplashScreen.preventAutoHideAsync().catch(() => {});

const STORAGE_KEY = 'english_lesson_mobile_progress_v2';

type Tab = 'path' | 'revision' | 'dictionary' | 'coach' | 'badges';

function mergeLoadedProgress(parsed: Partial<UserProgress>): UserProgress {
  const defaults = getDefaultProgress();
  return {
    ...defaults,
    ...parsed,
    theme: parsed.theme === 'dark' ? 'dark' : 'light',
    accent: parsed.accent === 'en-GB' ? 'en-GB' : 'en-US',
    parts: {
      ...defaults.parts,
      ...(parsed.parts ?? {}),
    },
    stories: {
      ...defaults.stories,
      ...(parsed.stories ?? {}),
    },
    favoriteWordIds: Array.isArray(parsed.favoriteWordIds)
      ? parsed.favoriteWordIds
      : defaults.favoriteWordIds,
    practicedWords: parsed.practicedWords ?? {},
    masteredRevisionIds: Array.isArray(parsed.masteredRevisionIds)
      ? parsed.masteredRevisionIds
      : [],
    weakQuestionIds: Array.isArray(parsed.weakQuestionIds) ? parsed.weakQuestionIds : [],
    cachedOnlineWords: Array.isArray(parsed.cachedOnlineWords) ? parsed.cachedOnlineWords : [],
    unlockedBadges: Array.isArray(parsed.unlockedBadges) ? parsed.unlockedBadges : [],
    revisionSessionsCompleted: parsed.revisionSessionsCompleted ?? 0,
  };
}

class AppErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error?.message || 'Erreur inattendue' };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    SplashScreen.hideAsync().catch(() => {});
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaProvider>
          <SafeAreaView style={styles.errorContainer}>
            <Text style={styles.errorTitle}>English Lesson</Text>
            <Text style={styles.errorBody}>
              Une erreur est survenue au démarrage ({this.state.message}).
            </Text>
            <Pressable
              style={styles.primaryBtn}
              onPress={() => {
                AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
                this.setState({ hasError: false, message: '' });
              }}
            >
              <Text style={styles.primaryBtnText}>Réinitialiser et relancer</Text>
            </Pressable>
          </SafeAreaView>
        </SafeAreaProvider>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <SafeAreaProvider>
        <EnglishLessonMain />
      </SafeAreaProvider>
    </AppErrorBoundary>
  );
}

function EnglishLessonMain() {
  const [tab, setTab] = useState<Tab>('path');
  const [progress, setProgress] = useState<UserProgress>(getDefaultProgress);

  const [activePart, setActivePart] = useState<LevelPart | null>(null);
  const [activeStory, setActiveStory] = useState<StoryDefinition | null>(null);
  const [storyAnswers, setStoryAnswers] = useState<Record<string, number>>({});
  const [storySubmitted, setStorySubmitted] = useState(false);

  const [qIndex, setQIndex] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [quizDone, setQuizDone] = useState(false);

  const [revIndex, setRevIndex] = useState(0);
  const [revFlipped, setRevFlipped] = useState(false);

  const [query, setQuery] = useState('');
  const [onlineStatus, setOnlineStatus] = useState<string | null>(null);
  const [loadingOnline, setLoadingOnline] = useState(false);

  const [coachWord, setCoachWord] = useState('Schedule');
  const [coachTip, setCoachTip] = useState(
    'En américain : « SKED-joul ». En britannique : « CHED-youl ».'
  );
  const [coachSyllables, setCoachSyllables] = useState('sched · ule');

  const isDark = progress.theme === 'dark';

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (active && raw) {
          const parsed = JSON.parse(raw) as Partial<UserProgress>;
          setProgress(mergeLoadedProgress(parsed));
        }
      })
      .catch(() => {})
      .finally(() => {
        SplashScreen.hideAsync().catch(() => {});
      });
    return () => {
      active = false;
    };
  }, []);

  const persistProgress = (next: UserProgress) => {
    const updatedBadges = evaluateUnlockedBadges(next);
    const finalized: UserProgress = { ...next, unlockedBadges: updatedBadges };
    setProgress(finalized);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(finalized)).catch(() => {});
  };

  const speak = (text: string, rate = 0.95, lang: AccentMode | 'fr-FR' = progress.accent) => {
    Speech.stop();
    Speech.speak(text, { language: lang, rate });
  };

  const speakGuidedCoach = (englishText: string, syllables: string) => {
    Speech.stop();
    const cue = `Écoutez bien les syllabes : ${syllables.replace(/·/g, ', ')}. Répétez après moi.`;
    Speech.speak(cue, {
      language: 'fr-FR',
      rate: 1.0,
      onDone: () => {
        Speech.speak(englishText, {
          language: progress.accent,
          rate: 0.62,
          onDone: () => {
            Speech.speak(englishText, { language: progress.accent, rate: 0.95 });
          },
        });
      },
    });
  };

  const allDictionary: DictionaryEntry[] = useMemo(
    () => [...progress.cachedOnlineWords, ...DICTIONARY_ENTRIES],
    [progress.cachedOnlineWords]
  );

  const filteredDictionary = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allDictionary;
    return allDictionary.filter(
      (item) =>
        item.word.toLowerCase().includes(q) ||
        item.translationFr.toLowerCase().includes(q)
    );
  }, [allDictionary, query]);

  const handleFetchMoreWords = async () => {
    setOnlineStatus(null);
    setLoadingOnline(true);
    const { words, offline } = await fetchNewDiscoveryWordsBatch(
      allDictionary.map((w) => w.word),
      4
    );
    setLoadingOnline(false);
    if (offline) {
      setOnlineStatus('Hors ligne : dictionnaire local toujours actif.');
      return;
    }
    if (words.length === 0) {
      setOnlineStatus('Tous les mots de découverte sont déjà enregistrés.');
      return;
    }
    const existingIds = new Set(progress.cachedOnlineWords.map((w) => w.id));
    const fresh = words.filter((w) => !existingIds.has(w.id));
    persistProgress({
      ...progress,
      xp: progress.xp + fresh.length * 10,
      cachedOnlineWords: [...fresh, ...progress.cachedOnlineWords],
    });
    setOnlineStatus(`${fresh.length} nouveaux mots sauvegardés sur votre téléphone.`);
  };

  const handleLookupCustomWord = async () => {
    const cleaned = query.trim();
    if (!cleaned) return;
    setLoadingOnline(true);
    const found = await fetchOnlineWord(cleaned);
    setLoadingOnline(false);
    if (!found) {
      setOnlineStatus('Impossible de charger en ligne (hors ligne ou mot introuvable).');
      return;
    }
    const existingIds = new Set(progress.cachedOnlineWords.map((w) => w.id));
    if (!existingIds.has(found.id)) {
      persistProgress({
        ...progress,
        xp: progress.xp + 10,
        cachedOnlineWords: [found, ...progress.cachedOnlineWords],
      });
    }
    setOnlineStatus(`« ${found.word} » ajouté localement.`);
  };

  const startPart = (part: LevelPart) => {
    Speech.stop();
    setActiveStory(null);
    setActivePart(part);
    setQIndex(0);
    setSelectedIdx(null);
    setScore(0);
    setHearts(3);
    setQuizDone(false);
  };

  const startStory = (story: StoryDefinition) => {
    Speech.stop();
    setActivePart(null);
    setActiveStory(story);
    setStoryAnswers({});
    setStorySubmitted(false);
  };

  const handleAnswer = (idx: number) => {
    if (!activePart || selectedIdx !== null) return;
    setSelectedIdx(idx);
    const q = activePart.questions[qIndex];
    if (idx === q.correctIndex) {
      setScore((s) => s + 1);
    } else {
      setHearts((h) => Math.max(0, h - 1));
    }
  };

  const handleNextQuestion = () => {
    if (!activePart) return;
    Speech.stop();
    if (hearts === 0 || qIndex + 1 >= activePart.questions.length) {
      const total = activePart.questions.length;
      const percent = Math.round((score / total) * 100);
      const passed = hearts > 0 && percent >= activePart.passingScorePercent;
      const stars = calculateStars(score, total);
      const existing = progress.parts[activePart.id];
      persistProgress({
        ...progress,
        xp: progress.xp + (passed ? activePart.xpReward + score * 10 : score * 10),
        parts: {
          ...progress.parts,
          [activePart.id]: {
            completed: existing.completed || passed,
            bestScore: Math.max(existing.bestScore, score),
            totalQuestions: total,
            stars: Math.max(existing.stars, stars) as 0 | 1 | 2 | 3,
            attempts: existing.attempts + 1,
          },
        },
      });
      setQuizDone(true);
      return;
    }
    setQIndex((i) => i + 1);
    setSelectedIdx(null);
  };

  const palette = {
    bg: isDark ? '#020617' : '#F8FAFC',
    card: isDark ? '#0F172A' : '#FFFFFF',
    border: isDark ? '#1E293B' : '#E2E8F0',
    text: isDark ? '#F1F5F9' : '#0F172A',
    muted: isDark ? '#94A3B8' : '#64748B',
    surface: isDark ? '#1E293B' : '#F1F5F9',
  };

  const currentRevCard = allDictionary[revIndex % Math.max(allDictionary.length, 1)];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.bg }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: palette.card, borderBottomColor: palette.border },
        ]}
      >
        <Text style={[styles.brand, { color: palette.text }]}>English Lesson</Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() =>
              persistProgress({
                ...progress,
                theme: isDark ? 'light' : 'dark',
              })
            }
            style={[styles.pillBtn, { backgroundColor: palette.surface }]}
          >
            <Text style={[styles.accentBtnText, { color: palette.text }]}>
              {isDark ? 'Clair' : 'Sombre'}
            </Text>
          </Pressable>
          <View style={[styles.accentToggle, { backgroundColor: palette.surface }]}>
            {(['en-US', 'en-GB'] as AccentMode[]).map((mode) => (
              <Pressable
                key={mode}
                onPress={() => persistProgress({ ...progress, accent: mode })}
                style={[
                  styles.accentBtn,
                  progress.accent === mode && { backgroundColor: palette.card },
                ]}
              >
                <Text
                  style={[
                    styles.accentBtnText,
                    { color: progress.accent === mode ? palette.text : palette.muted },
                  ]}
                >
                  {mode === 'en-US' ? 'US' : 'UK'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {activeStory ? (
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Pressable onPress={() => setActiveStory(null)}>
              <Text style={styles.linkText}>← Retour au parcours</Text>
            </Pressable>
            <Text style={[styles.kicker, { color: palette.muted }]}>
              Niveau {activeStory.levelId} ·{' '}
              {activeStory.position === 'start' ? 'Histoire d’ouverture' : 'Histoire finale'}
            </Text>
            <Text style={[styles.title, { color: palette.text }]}>{activeStory.titleEn}</Text>
            <Pressable
              style={styles.primaryBtn}
              onPress={() => speak(activeStory.paragraphsEn.join(' '), 0.92)}
            >
              <Text style={styles.primaryBtnText}>Écouter toute l’histoire</Text>
            </Pressable>

            {activeStory.paragraphsEn.map((p, idx) => (
              <View key={idx} style={{ gap: 4, paddingTop: 6 }}>
                <Text style={[styles.subtitle, { color: palette.text }]}>{p}</Text>
                <Text style={[styles.kicker, { color: palette.muted }]}>
                  {activeStory.paragraphsFr[idx]}
                </Text>
              </View>
            ))}

            <Text style={[styles.partTitle, { color: palette.text, marginTop: 10 }]}>
              Compréhension
            </Text>
            {activeStory.questions.map((q) => (
              <View key={q.id} style={{ gap: 6 }}>
                <Text style={[styles.subtitle, { color: palette.text, fontWeight: '600' }]}>
                  {q.promptFr}
                </Text>
                {q.options.map((opt, oIdx) => {
                  const picked = storyAnswers[q.id] === oIdx;
                  const right = storySubmitted && q.correctIndex === oIdx;
                  return (
                    <Pressable
                      key={opt}
                      disabled={storySubmitted}
                      onPress={() => setStoryAnswers((prev) => ({ ...prev, [q.id]: oIdx }))}
                      style={[
                        styles.optionBtn,
                        { borderColor: palette.border, backgroundColor: palette.bg },
                        picked && { borderColor: '#2563EB' },
                        right && styles.optionRight,
                      ]}
                    >
                      <Text style={{ color: palette.text }}>{opt}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}

            {!storySubmitted ? (
              <Pressable
                style={styles.primaryBtn}
                onPress={() => {
                  const sScore = activeStory.questions.reduce(
                    (acc, q) => acc + (storyAnswers[q.id] === q.correctIndex ? 1 : 0),
                    0
                  );
                  setStorySubmitted(true);
                  if (sScore >= 2) {
                    const prevS = progress.stories[activeStory.id];
                    persistProgress({
                      ...progress,
                      xp: progress.xp + (prevS.completed ? 20 : activeStory.xpReward),
                      stories: {
                        ...progress.stories,
                        [activeStory.id]: {
                          completed: true,
                          bestScore: Math.max(prevS.bestScore, sScore),
                          totalQuestions: activeStory.questions.length,
                        },
                      },
                    });
                  }
                }}
              >
                <Text style={styles.primaryBtnText}>Valider l’histoire</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.primaryBtn} onPress={() => setActiveStory(null)}>
                <Text style={styles.primaryBtnText}>Continuer le parcours</Text>
              </Pressable>
            )}
          </View>
        ) : activePart ? (
          quizDone ? (
            <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <Text style={[styles.kicker, { color: palette.muted }]}>
                Niveau {activePart.levelId} · Partie {activePart.partNumber}
              </Text>
              <Text style={[styles.title, { color: palette.text }]}>
                {hearts > 0 ? 'Quiz terminé !' : 'Plus de vies'}
              </Text>
              <Text style={[styles.subtitle, { color: palette.muted }]}>
                Score : {score} / {activePart.questions.length}
              </Text>
              <Pressable style={styles.primaryBtn} onPress={() => setActivePart(null)}>
                <Text style={styles.primaryBtnText}>Retour au parcours</Text>
              </Pressable>
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <View style={styles.quizTop}>
                <Pressable onPress={() => setActivePart(null)}>
                  <Text style={styles.linkText}>Quitter</Text>
                </Pressable>
                <Text style={[styles.kicker, { color: palette.muted }]}>
                  Question {qIndex + 1}/{activePart.questions.length} · Vies : {hearts}
                </Text>
              </View>

              <Text style={[styles.title, { color: palette.text }]}>
                {activePart.questions[qIndex].promptFr}
              </Text>

              {(activePart.questions[qIndex].kind === 'audio-choice' ||
                activePart.questions[qIndex].kind === 'pronounce') && (
                <View style={styles.audioRow}>
                  <Pressable
                    style={[styles.primaryBtn, { flex: 1 }]}
                    onPress={() => speak(activePart.questions[qIndex].targetEn, 0.95)}
                  >
                    <Text style={styles.primaryBtnText}>Écouter</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.secondaryBtn, { borderColor: palette.border, backgroundColor: palette.card }]}
                    onPress={() => speak(activePart.questions[qIndex].targetEn, 0.6)}
                  >
                    <Text style={[styles.secondaryBtnText, { color: palette.text }]}>Voix lente</Text>
                  </Pressable>
                </View>
              )}

              <View style={styles.optionsList}>
                {activePart.questions[qIndex].options.map((opt, idx) => {
                  const answered = selectedIdx !== null;
                  const isRight = idx === activePart.questions[qIndex].correctIndex;
                  const isPicked = idx === selectedIdx;
                  return (
                    <Pressable
                      key={opt}
                      disabled={answered}
                      onPress={() => handleAnswer(idx)}
                      style={[
                        styles.optionBtn,
                        { borderColor: palette.border, backgroundColor: palette.bg },
                        answered && isRight && styles.optionRight,
                        answered && isPicked && !isRight && styles.optionWrong,
                      ]}
                    >
                      <Text style={[styles.optionText, { color: palette.text }]}>{opt}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {selectedIdx !== null && (
                <View style={[styles.feedbackBox, { backgroundColor: palette.surface }]}>
                  <Text style={[styles.feedbackText, { color: palette.text }]}>
                    {activePart.questions[qIndex].explanationFr}
                  </Text>
                  <Pressable style={styles.primaryBtn} onPress={handleNextQuestion}>
                    <Text style={styles.primaryBtnText}>Continuer</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )
        ) : tab === 'path' ? (
          <View style={styles.stack}>
            <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <Text style={[styles.kicker, { color: palette.muted }]}>
                Stockage local · {progress.unlockedBadges.length}/{BADGES.length} badges
              </Text>
              <Text style={[styles.title, { color: palette.text }]}>{progress.xp} XP gagnés</Text>
              <Text style={[styles.subtitle, { color: palette.muted }]}>
                Chaque niveau commence et se termine par une histoire, avec 2 parties de quiz.
              </Text>
            </View>

            {LEVELS.map((level) => {
              const openUnlocked = isStoryUnlocked(level.openingStory.id as StoryId, progress);
              const closeUnlocked = isStoryUnlocked(level.closingStory.id as StoryId, progress);
              return (
                <View
                  key={level.id}
                  style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}
                >
                  <Text style={[styles.kicker, { color: palette.muted }]}>
                    Niveau {level.id} · {level.cefr}
                  </Text>
                  <Text style={[styles.title, { color: palette.text }]}>{level.titleFr}</Text>

                  <View style={[styles.partRow, { borderTopColor: palette.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.partTitle, { color: palette.text }]}>
                        1. {level.openingStory.titleEn}
                      </Text>
                      <Text style={[styles.partMeta, { color: palette.muted }]}>
                        Histoire d’ouverture
                      </Text>
                    </View>
                    {openUnlocked && (
                      <Pressable style={styles.smallBtn} onPress={() => startStory(level.openingStory)}>
                        <Text style={styles.smallBtnText}>Lire</Text>
                      </Pressable>
                    )}
                  </View>

                  {level.parts.map((part) => {
                    const unlocked = isPartUnlocked(part.id as PartId, progress);
                    const stats = progress.parts[part.id];
                    return (
                      <View key={part.id} style={[styles.partRow, { borderTopColor: palette.border }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.partTitle, { color: palette.text }]}>
                            {part.partNumber + 1}. Quiz · {part.titleFr}
                          </Text>
                          <Text style={[styles.partMeta, { color: palette.muted }]}>
                            {stats.completed
                              ? `Validé · ${stats.bestScore}/${stats.totalQuestions}`
                              : unlocked
                                ? `${part.questions.length} questions`
                                : 'Verrouillé'}
                          </Text>
                        </View>
                        {unlocked && (
                          <Pressable style={styles.smallBtn} onPress={() => startPart(part)}>
                            <Text style={styles.smallBtnText}>
                              {stats.completed ? 'Rejouer' : 'Jouer'}
                            </Text>
                          </Pressable>
                        )}
                      </View>
                    );
                  })}

                  <View style={[styles.partRow, { borderTopColor: palette.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.partTitle, { color: palette.text }]}>
                        4. {level.closingStory.titleEn}
                      </Text>
                      <Text style={[styles.partMeta, { color: palette.muted }]}>
                        Histoire finale
                      </Text>
                    </View>
                    {closeUnlocked && (
                      <Pressable style={styles.smallBtn} onPress={() => startStory(level.closingStory)}>
                        <Text style={styles.smallBtnText}>Lire</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ) : tab === 'revision' && currentRevCard ? (
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Text style={[styles.kicker, { color: palette.muted }]}>
              Mode révision · Carte {(revIndex % allDictionary.length) + 1}/{allDictionary.length}
            </Text>
            <Text style={[styles.wordDisplay, { color: palette.text }]}>{currentRevCard.word}</Text>
            <Text style={[styles.kicker, { color: palette.muted }]}>
              {progress.accent === 'en-US' ? currentRevCard.ipaUS : currentRevCard.ipaUK}
            </Text>
            {revFlipped && (
              <Text style={[styles.title, { color: '#2563EB' }]}>
                {currentRevCard.translationFr}
              </Text>
            )}
            <View style={styles.audioRow}>
              <Pressable style={[styles.primaryBtn, { flex: 1 }]} onPress={() => speak(currentRevCard.word, 0.95)}>
                <Text style={styles.primaryBtnText}>Écouter</Text>
              </Pressable>
              <Pressable
                style={[styles.secondaryBtn, { borderColor: palette.border, backgroundColor: palette.card }]}
                onPress={() => setRevFlipped((f) => !f)}
              >
                <Text style={[styles.secondaryBtnText, { color: palette.text }]}>
                  {revFlipped ? 'Cacher' : 'Traduction'}
                </Text>
              </Pressable>
            </View>
            <Pressable
              style={[styles.secondaryBtn, { borderColor: palette.border, backgroundColor: palette.surface }]}
              onPress={() => {
                setRevFlipped(false);
                setRevIndex((i) => i + 1);
              }}
            >
              <Text style={[styles.secondaryBtnText, { color: palette.text }]}>Carte suivante →</Text>
            </Pressable>
          </View>
        ) : tab === 'dictionary' ? (
          <View style={styles.stack}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Chercher un mot anglais ou français..."
              placeholderTextColor={palette.muted}
              style={[
                styles.input,
                { backgroundColor: palette.card, borderColor: palette.border, color: palette.text },
              ]}
            />
            <View style={styles.audioRow}>
              <Pressable style={[styles.primaryBtn, { flex: 1 }]} onPress={handleFetchMoreWords}>
                <Text style={styles.primaryBtnText}>
                  {loadingOnline ? 'Chargement…' : 'Nouveaux mots en ligne'}
                </Text>
              </Pressable>
              {query.trim().length > 1 && (
                <Pressable
                  style={[styles.secondaryBtn, { borderColor: palette.border, backgroundColor: palette.card }]}
                  onPress={handleLookupCustomWord}
                >
                  <Text style={[styles.secondaryBtnText, { color: palette.text }]}>Chercher en ligne</Text>
                </Pressable>
              )}
            </View>
            {onlineStatus && (
              <Text style={[styles.kicker, { color: palette.muted }]}>{onlineStatus}</Text>
            )}
            {filteredDictionary.map((entry) => (
              <View
                key={entry.id}
                style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}
              >
                <View style={styles.dictHeader}>
                  <View>
                    <Text style={[styles.title, { color: palette.text }]}>{entry.word}</Text>
                    <Text style={[styles.kicker, { color: palette.muted }]}>
                      {progress.accent === 'en-US' ? entry.ipaUS : entry.ipaUK} · {entry.syllables}
                    </Text>
                  </View>
                  <Pressable style={styles.smallBtn} onPress={() => speak(entry.word, 0.95)}>
                    <Text style={styles.smallBtnText}>Voix</Text>
                  </Pressable>
                </View>
                <Text style={[styles.partTitle, { color: palette.text }]}>{entry.translationFr}</Text>
                <Text style={[styles.subtitle, { color: palette.muted }]}>
                  {entry.pronunciationTipFr}
                </Text>
                <Pressable
                  onPress={() => {
                    setCoachWord(entry.word);
                    setCoachSyllables(entry.syllables);
                    setCoachTip(entry.pronunciationTipFr);
                    setTab('coach');
                  }}
                >
                  <Text style={styles.linkText}>Travailler la prononciation →</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : tab === 'coach' ? (
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Text style={[styles.kicker, { color: palette.muted }]}>Coach vocal · Guidage FR + EN</Text>
            <Text style={[styles.wordDisplay, { color: palette.text }]}>{coachWord}</Text>
            <Text style={[styles.kicker, { color: palette.muted }]}>Syllabes : {coachSyllables}</Text>
            <Text style={[styles.subtitle, { color: palette.muted }]}>{coachTip}</Text>

            <TextInput
              value={coachWord}
              onChangeText={(txt) => {
                setCoachWord(txt);
                setCoachSyllables(txt.split(/\s+/).join(' · '));
              }}
              placeholder="Ou tapez votre mot..."
              placeholderTextColor={palette.muted}
              style={[
                styles.input,
                { backgroundColor: palette.bg, borderColor: palette.border, color: palette.text },
              ]}
            />

            <Pressable
              style={styles.primaryBtn}
              onPress={() => speakGuidedCoach(coachWord, coachSyllables)}
            >
              <Text style={styles.primaryBtnText}>Lancer la voix guide (FR + EN)</Text>
            </Pressable>

            <View style={styles.audioRow}>
              <Pressable
                style={[styles.secondaryBtn, { borderColor: palette.border, backgroundColor: palette.card }]}
                onPress={() => speak(coachWord, 0.95)}
              >
                <Text style={[styles.secondaryBtnText, { color: palette.text }]}>Normal</Text>
              </Pressable>
              <Pressable
                style={[styles.secondaryBtn, { borderColor: palette.border, backgroundColor: palette.card }]}
                onPress={() => speak(coachWord, 0.6)}
              >
                <Text style={[styles.secondaryBtnText, { color: palette.text }]}>Lent (0.6x)</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.stack}>
            {BADGES.map((b) => {
              const unlocked = progress.unlockedBadges.includes(b.id);
              return (
                <View
                  key={b.id}
                  style={[
                    styles.card,
                    {
                      backgroundColor: palette.card,
                      borderColor: unlocked ? '#D97706' : palette.border,
                      opacity: unlocked ? 1 : 0.6,
                    },
                  ]}
                >
                  <Text style={[styles.partTitle, { color: palette.text }]}>
                    {unlocked ? '✓ ' : ''}
                    {b.titleFr}
                  </Text>
                  <Text style={[styles.subtitle, { color: palette.muted }]}>{b.descriptionFr}</Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {!activePart && !activeStory && (
        <View
          style={[
            styles.bottomBar,
            { backgroundColor: palette.card, borderTopColor: palette.border },
          ]}
        >
          {(
            [
              ['path', 'Parcours'],
              ['revision', 'Révision'],
              ['dictionary', 'Dico'],
              ['coach', 'Coach'],
              ['badges', 'Badges'],
            ] as [Tab, string][]
          ).map(([id, label]) => (
            <Pressable key={id} onPress={() => setTab(id)} style={styles.tabItem}>
              <Text
                style={[
                  styles.tabText,
                  { color: tab === id ? '#2563EB' : palette.muted },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  brand: { fontSize: 19, fontWeight: '700' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pillBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  accentToggle: { flexDirection: 'row', borderRadius: 8, padding: 3 },
  accentBtn: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 6 },
  accentBtnText: { fontSize: 12, fontWeight: '600' },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  stack: { gap: 16 },
  card: { borderRadius: 16, borderWidth: 1, padding: 18, gap: 10 },
  kicker: { fontSize: 12, fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '700' },
  wordDisplay: { fontSize: 30, fontWeight: '700' },
  subtitle: { fontSize: 14, lineHeight: 20 },
  partRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  partTitle: { fontSize: 15, fontWeight: '600' },
  partMeta: { fontSize: 12, marginTop: 2 },
  smallBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  smallBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  primaryBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  secondaryBtn: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '600' },
  audioRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  quizTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  linkText: { color: '#2563EB', fontSize: 13, fontWeight: '600' },
  optionsList: { gap: 10, marginTop: 8 },
  optionBtn: { borderWidth: 1, borderRadius: 12, padding: 14 },
  optionRight: { borderColor: '#059669', backgroundColor: '#ECFDF5' },
  optionWrong: { borderColor: '#DC2626', backgroundColor: '#FEF2F2' },
  optionText: { fontSize: 15, fontWeight: '500' },
  feedbackBox: { marginTop: 8, padding: 14, borderRadius: 12, gap: 12 },
  feedbackText: { fontSize: 13, lineHeight: 19 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  dictHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bottomBar: { flexDirection: 'row', borderTopWidth: 1, paddingVertical: 10 },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  tabText: { fontSize: 12, fontWeight: '600' },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F8FAFC',
    gap: 12,
  },
  errorTitle: { fontSize: 22, fontWeight: '700', color: '#0F172A' },
  errorBody: { fontSize: 14, lineHeight: 20, color: '#475569', textAlign: 'center' },
});
