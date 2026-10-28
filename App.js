
import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { supabase } from './lib/supabase';

const NAVY = '#102D57';
const GOLD = '#F5BD35';
const BG = '#F5F7FA';
const MUTED = '#64748B';

const TABS = [
  { id: 'Inicio', icon: '⌂', label: 'Início' },
  { id: 'Descobrir', icon: '⌕', label: 'Descobrir' },
  { id: 'Criar', icon: '+', label: 'Criar' },
  { id: 'Projetos', icon: '▤', label: 'Projetos' },
  { id: 'Perfil', icon: '○', label: 'Perfil' },
];

export default function App() {
  const [screen, setScreen] = useState('Inicio');
  const [user, setUser] = useState(null);
  const [ideas, setIdeas] = useState([]);
  const [projects, setProjects] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let mounted = true;

    async function initialise() {
      if (!supabase) {
        setNotice('A ligação ao Supabase não está configurada.');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) setNotice(error.message);
      setUser(data?.session?.user ?? null);
      setLoading(false);
    }

    initialise();

    const { data: listener } = supabase
      ? supabase.auth.onAuthStateChange((_event, session) => {
          if (mounted) setUser(session?.user ?? null);
        })
      : { data: { subscription: null } };

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user || !supabase) {
      setIdeas([]);
      setProjects([]);
      setChallenges([]);
      return;
    }

    loadData();
  }, [user?.id]);

  async function loadData() {
    if (!supabase || !user) return;

    setLoading(true);
    setNotice('');

    try {
      const [ideasResult, projectsResult, challengesResult] =
        await Promise.all([
          supabase
            .from('ideas')
            .select('id, author_id, title, description, category, status, created_at')
            .order('created_at', { ascending: false }),
          supabase
            .from('projects')
            .select('id, creator_id, title, description, province, status, created_at')
            .order('created_at', { ascending: false }),
          supabase
            .from('challenges')
            .select('id, creator_id, title, description, category, status, deadline, created_at')
            .order('created_at', { ascending: false }),
        ]);

      const failed = [
        ideasResult.error,
        projectsResult.error,
        challengesResult.error,
      ].find(Boolean);

      if (failed) throw failed;

      setIdeas(ideasResult.data ?? []);
      setProjects(projectsResult.data ?? []);
      setChallenges(challengesResult.data ?? []);
    } catch (error) {
      setNotice(error.message || 'Não foi possível carregar os dados.');
    } finally {
      setLoading(false);
    }
  }

  async function ensureProfile(currentUser) {
    const name =
      currentUser.user_metadata?.display_name ||
      currentUser.email?.split('@')[0] ||
      'Utilizador';

    const { error } = await supabase.from('profiles').upsert(
      {
        id: currentUser.id,
        display_name: name,
      },
      { onConflict: 'id' }
    );

    if (error) throw error;
  }

  async function authenticate() {
    if (!supabase) {
      setNotice('O Supabase não está configurado.');
      return;
    }

    if (!email.trim() || !password) {
      setNotice('Preenche o e-mail e a palavra-passe.');
      return;
    }

    if (isRegister && displayName.trim().length < 2) {
      setNotice('Escreve o teu nome.');
      return;
    }

    setSaving(true);
    setNotice('');

    try {
      if (isRegister) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { display_name: displayName.trim() },
          },
        });

        if (error) throw error;

        if (data.session && data.user) {
          await ensureProfile(data.user);
          setNotice('Conta criada com sucesso.');
        } else {
          setNotice(
            'Registo enviado. Confirma o teu e-mail antes de iniciares sessão.'
          );
          setIsRegister(false);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        if (data.user) await ensureProfile(data.user);
        setNotice('Sessão iniciada com sucesso.');
      }
    } catch (error) {
      setNotice(error.message || 'Não foi possível autenticar.');
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      setNotice(error.message);
      return;
    }

    setNotice('Sessão terminada.');
    setScreen('Inicio');
  }

  async function publishIdea() {
    if (!user) {
      setNotice('Inicia sessão para publicares uma ideia.');
      setScreen('Perfil');
      return;
    }

    if (title.trim().length < 3) {
      setNotice('O título deve ter pelo menos 3 caracteres.');
      return;
    }

    if (!description.trim()) {
      setNotice('Escreve uma descrição para a tua ideia.');
      return;
    }

    setSaving(true);
    setNotice('');

    try {
      const { error } = await supabase.from('ideas').insert({
        author_id: user.id,
        title: title.trim(),
        description: description.trim(),
        category: category.trim() || null,
        status: 'open',
      });

      if (error) throw error;

      setTitle('');
      setDescription('');
      setCategory('');
      await loadData();
      setNotice('A tua ideia foi guardada no Supabase.');
      setScreen('Inicio');
    } catch (error) {
      setNotice(error.message || 'Não foi possível publicar a ideia.');
    } finally {
      setSaving(false);
    }
  }

  const filteredIdeas = ideas.filter((idea) =>
    `${idea.title} ${idea.description} ${idea.category || ''}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  function Header() {
    return (
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>
            KON<Text style={styles.logoGold}>E</Text>CTA
          </Text>
          <Text style={styles.tagline}>
            Ideias que unem. Pessoas que realizam.
          </Text>
        </View>
        <TouchableOpacity
          style={styles.notification}
          onPress={loadData}
          accessibilityLabel="Actualizar dados"
        >
          <Text style={styles.notificationText}>↻</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function IdeaCard({ idea }) {
    return (
      <View style={styles.ideaCard}>
        <View style={styles.categoryRow}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>
              {idea.category || 'Comunidade'}
            </Text>
          </View>
          <Text style={styles.smallText}>
            {idea.status === 'open' ? 'Aberta' : idea.status}
          </Text>
        </View>

        <Text style={styles.ideaTitle}>{idea.title}</Text>
        {!!idea.description && (
          <Text style={styles.ideaDescription}>{idea.description}</Text>
        )}
        <Text style={styles.dateText}>
          {idea.author_id === user?.id ? 'Publicada por ti' : 'Ideia da comunidade'}
        </Text>
      </View>
    );
  }

  function HomeScreen() {
    return (
      <>
        <Text style={styles.pageTitle}>A tua comunidade de ideias</Text>
        <Text style={styles.subtitle}>
          Descobre, participa e transforma ideias em ação.
        </Text>

        <TouchableOpacity
          style={styles.createPrompt}
          onPress={() => setScreen(user ? 'Criar' : 'Perfil')}
        >
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarLetter}>K</Text>
          </View>
          <Text style={styles.promptText}>Que ideia queres partilhar?</Text>
          <Text style={styles.promptPlus}>+</Text>
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ideias da comunidade</Text>
          <TouchableOpacity onPress={() => setScreen('Descobrir')}>
            <Text style={styles.linkText}>Ver todas</Text>
          </TouchableOpacity>
        </View>

        {!user ? (
          <View style={styles.infoPanel}>
            <Text style={styles.infoTitle}>Entra no KONECTA</Text>
            <Text style={styles.infoText}>
              Inicia sessão para consultar as ideias e participar na comunidade.
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => setScreen('Perfil')}
            >
              <Text style={styles.primaryButtonText}>Entrar ou criar conta</Text>
            </TouchableOpacity>
          </View>
        ) : filteredIdeas.length ? (
          filteredIdeas.map((idea) => <IdeaCard key={idea.id} idea={idea} />)
        ) : (
          <Text style={styles.emptyText}>
            Ainda não há ideias publicadas. Podes ser a primeira pessoa a partilhar uma.
          </Text>
        )}
      </>
    );
  }

  function DiscoverScreen() {
    return (
      <>
        <Text style={styles.pageTitle}>Descobrir</Text>
        <Text style={styles.subtitle}>
          Encontra ideias, desafios e projectos da comunidade.
        </Text>

        <TextInput
          style={styles.input}
          value={search}
          onChangeText={setSearch}
          placeholder="Pesquisar ideias..."
          placeholderTextColor={MUTED}
        />

        <Text style={styles.sectionTitle}>Ideias</Text>
        {!user ? (
          <Text style={styles.emptyText}>Inicia sessão para consultar as ideias.</Text>
        ) : filteredIdeas.length ? (
          filteredIdeas.map((idea) => <IdeaCard key={idea.id} idea={idea} />)
        ) : (
          <Text style={styles.emptyText}>Nenhuma ideia encontrada.</Text>
        )}

        <View style={styles.infoPanel}>
          <Text style={styles.infoTitle}>Desafios reais</Text>
          {challenges.length === 0 ? (
            <Text style={styles.infoText}>Ainda não existem desafios publicados.</Text>
          ) : (
            challenges.map((challenge) => (
              <View key={challenge.id} style={styles.listItem}>
                <Text style={styles.ideaTitle}>{challenge.title}</Text>
                {!!challenge.description && (
                  <Text style={styles.ideaDescription}>{challenge.description}</Text>
                )}
                <Text style={styles.dateText}>Estado: {challenge.status}</Text>
              </View>
            ))
          )}
        </View>
      </>
    );
  }

  function CreateScreen() {
    return (
      <>
        <Text style={styles.pageTitle}>Partilha uma ideia</Text>
        <Text style={styles.subtitle}>
          Uma boa ideia pode ser o começo de uma grande mudança.
        </Text>

        {!user ? (
          <View style={styles.infoPanel}>
            <Text style={styles.infoText}>
              Precisas de iniciar sessão para publicar.
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => setScreen('Perfil')}
            >
              <Text style={styles.primaryButtonText}>Entrar ou criar conta</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.formCard}>
            <Text style={styles.label}>Título da ideia *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Ex.: Melhorar a nossa comunidade"
              placeholderTextColor={MUTED}
              maxLength={160}
            />

            <Text style={styles.label}>Descrição *</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              value={description}
              onChangeText={setDescription}
              placeholder="Explica a tua ideia e como pode ser realizada..."
              placeholderTextColor={MUTED}
              multiline
              maxLength={10000}
            />

            <Text style={styles.label}>Categoria (opcional)</Text>
            <TextInput
              style={styles.input}
              value={category}
              onChangeText={setCategory}
              placeholder="Ex.: Educação, comunidade, inovação"
              placeholderTextColor={MUTED}
              maxLength={80}
            />

            <TouchableOpacity
              style={[styles.primaryButton, saving && styles.disabledButton]}
              onPress={publishIdea}
              disabled={saving}
            >
              <Text style={styles.primaryButtonText}>
                {saving ? 'A guardar...' : 'Publicar ideia'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </>
    );
  }

  function ProjectsScreen() {
    return (
      <>
        <Text style={styles.pageTitle}>Projetos</Text>
        <Text style={styles.subtitle}>
          Ideias transformadas em iniciativas com objetivos e equipas.
        </Text>

        {!user ? (
          <Text style={styles.emptyText}>Inicia sessão para consultar projectos.</Text>
        ) : projects.length === 0 ? (
          <Text style={styles.emptyText}>
            Ainda não existem projectos publicados.
          </Text>
        ) : (
          projects.map((project) => (
            <View key={project.id} style={styles.ideaCard}>
              <Text style={styles.ideaTitle}>{project.title}</Text>
              {!!project.description && (
                <Text style={styles.ideaDescription}>{project.description}</Text>
              )}
              {!!project.province && (
                <Text style={styles.dateText}>{project.province}</Text>
              )}
              <Text style={styles.dateText}>Estado: {project.status}</Text>
            </View>
          ))
        )}
      </>
    );
  }

  function ProfileScreen() {
    return (
      <>
        <Text style={styles.pageTitle}>O teu perfil</Text>

        {user ? (
          <>
            <View style={styles.profileCard}>
              <View style={styles.largeAvatar}>
                <Text style={styles.largeAvatarText}>
                  {(user.email || 'K').charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.profileName}>
                {user.user_metadata?.display_name || 'Utilizador KONECTA'}
              </Text>
              <Text style={styles.subtitle}>{user.email}</Text>
              <Text style={styles.infoText}>
                Conta autenticada no Supabase.
              </Text>
              <TouchableOpacity style={styles.primaryButton} onPress={signOut}>
                <Text style={styles.primaryButtonText}>Terminar sessão</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoPanel}>
              <Text style={styles.infoTitle}>A tua participação</Text>
              <Text style={styles.infoText}>
                Ideias publicadas por ti: {ideas.filter((i) => i.author_id === user.id).length}
              </Text>
              <Text style={styles.infoText}>
                Projectos criados por ti: {projects.filter((p) => p.creator_id === user.id).length}
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.formCard}>
            <Text style={styles.infoTitle}>
              {isRegister ? 'Criar conta' : 'Iniciar sessão'}
            </Text>

            {isRegister && (
              <>
                <Text style={styles.label}>Nome</Text>
                <TextInput
                  style={styles.input}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="O teu nome"
                  placeholderTextColor={MUTED}
                />
              </>
            )}

            <Text style={styles.label}>E-mail</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="nome@exemplo.com"
              placeholderTextColor={MUTED}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.label}>Palavra-passe</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Pelo menos 6 caracteres"
              placeholderTextColor={MUTED}
              secureTextEntry
            />

            <TouchableOpacity
              style={[styles.primaryButton, saving && styles.disabledButton]}
              onPress={authenticate}
              disabled={saving}
            >
              <Text style={styles.primaryButtonText}>
                {saving
                  ? 'A processar...'
                  : isRegister
                  ? 'Criar conta'
                  : 'Entrar'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchAuth}
              onPress={() => {
                setIsRegister(!isRegister);
                setNotice('');
              }}
            >
              <Text style={styles.linkText}>
                {isRegister
                  ? 'Já tens conta? Inicia sessão'
                  : 'Ainda não tens conta? Regista-te'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </>
    );
  }

  function renderScreen() {
    switch (screen) {
      case 'Descobrir':
        return <DiscoverScreen />;
      case 'Criar':
        return <CreateScreen />;
      case 'Projetos':
        return <ProjectsScreen />;
      case 'Perfil':
        return <ProfileScreen />;
      default:
        return <HomeScreen />;
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar backgroundColor={NAVY} barStyle="light-content" />
      <Header />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {!!notice && (
          <TouchableOpacity onPress={() => setNotice('')}>
            <Text style={styles.notice}>{notice}  ×</Text>
          </TouchableOpacity>
        )}

        {loading ? (
          <ActivityIndicator color={NAVY} size="large" style={styles.loader} />
        ) : (
          renderScreen()
        )}
      </ScrollView>

      <View style={styles.bottomNav}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={styles.navItem}
            onPress={() => {
              setScreen(tab.id);
              setNotice('');
            }}
          >
            <Text
              style={[
                styles.navIcon,
                screen === tab.id && styles.activeNavIcon,
              ]}
            >
              {tab.icon}
            </Text>
            <Text
              style={[
                styles.navLabel,
                screen === tab.id && styles.activeNavLabel,
              ]}
            >
              {tab.label}
            </Text>
            {screen === tab.id && <View style={styles.activeLine} />}
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  header: {
    backgroundColor: NAVY,
    paddingHorizontal: 20,
    paddingVertical: 17,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: { fontSize: 27, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1 },
  logoGold: { color: GOLD },
  tagline: { color: '#E2E8F0', fontSize: 11, marginTop: 4 },
  notification: {
    height: 40, width: 40, borderRadius: 20,
    backgroundColor: '#23436D', alignItems: 'center',
    justifyContent: 'center',
  },
  notificationText: { color: '#FFFFFF', fontSize: 22 },
  content: { flex: 1 },
  contentContainer: { padding: 18, paddingBottom: 30 },
  pageTitle: { color: NAVY, fontSize: 24, fontWeight: '800', marginTop: 5 },
  subtitle: { color: MUTED, fontSize: 14, lineHeight: 21, marginTop: 7, marginBottom: 18 },
  createPrompt: {
    backgroundColor: '#FFFFFF', padding: 13, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 23,
  },
  avatarPlaceholder: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: NAVY,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarLetter: { color: GOLD, fontWeight: '900', fontSize: 17 },
  promptText: { flex: 1, color: MUTED, marginLeft: 11, fontSize: 13 },
  promptPlus: { color: NAVY, fontSize: 26, fontWeight: '700' },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 13,
  },
  sectionTitle: { color: NAVY, fontSize: 18, fontWeight: '800', marginBottom: 12 },
  linkText: { color: NAVY, fontSize: 13, fontWeight: '700' },
  ideaCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 13,
  },
  categoryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 11 },
  categoryBadge: { backgroundColor: '#FFF4D5', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  categoryText: { color: NAVY, fontSize: 11, fontWeight: '700' },
  smallText: { color: MUTED, fontSize: 11, marginLeft: 9 },
  ideaTitle: { color: NAVY, fontSize: 17, fontWeight: '800', lineHeight: 24 },
  ideaDescription: { color: MUTED, fontSize: 13, lineHeight: 20, marginTop: 7 },
  dateText: { color: MUTED, fontSize: 11, marginTop: 10 },
  input: {
    backgroundColor: '#FFFFFF', borderRadius: 11, padding: 13,
    borderWidth: 1, borderColor: '#CBD5E1', color: NAVY,
    fontSize: 14, marginBottom: 17,
  },
  multilineInput: { minHeight: 125, textAlignVertical: 'top' },
  label: { color: NAVY, fontSize: 13, fontWeight: '700', marginBottom: 8 },
  formCard: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  primaryButton: { backgroundColor: NAVY, padding: 15, borderRadius: 11, alignItems: 'center', marginTop: 9 },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  disabledButton: { opacity: 0.6 },
  notice: { color: NAVY, backgroundColor: '#FFF4D5', padding: 12, borderRadius: 10, marginBottom: 12, fontSize: 12 },
  infoPanel: { backgroundColor: '#FFFFFF', padding: 18, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 14 },
  infoTitle: { color: NAVY, fontSize: 18, fontWeight: '800' },
  infoText: { color: MUTED, fontSize: 13, lineHeight: 21, marginTop: 8 },
  emptyText: { color: MUTED, padding: 20, textAlign: 'center', lineHeight: 22 },
  profileCard: { alignItems: 'center', padding: 22, backgroundColor: '#FFFFFF', borderRadius: 14, marginBottom: 14 },
  largeAvatar: { height: 76, width: 76, borderRadius: 38, backgroundColor: NAVY, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  largeAvatarText: { color: GOLD, fontSize: 30, fontWeight: '900' },
  profileName: { color: NAVY, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  switchAuth: { alignItems: 'center', paddingVertical: 16 },
  loader: { marginTop: 40 },
  listItem: { borderTopWidth: 1, borderTopColor: '#EEF2F7', paddingTop: 13, marginTop: 13 },
  bottomNav: {
    flexDirection: 'row', backgroundColor: '#FFFFFF',
    borderTopWidth: 1, borderTopColor: '#E2E8F0',
    paddingTop: 8, paddingBottom: 5,
  },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 5 },
  navIcon: { color: MUTED, fontSize: 22, fontWeight: '600' },
  activeNavIcon: { color: NAVY },
  navLabel: { color: MUTED, fontSize: 10, marginTop: 3 },
  activeNavLabel: { color: NAVY, fontWeight: '800' },
  activeLine: { width: 20, height: 3, backgroundColor: GOLD, borderRadius: 3, marginTop: 5 },
});
