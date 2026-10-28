
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
  Image,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from './lib/supabase';
import { uploadImage } from './lib/cloudinary';

const COLORS = {
  navy: '#102D57',
  gold: '#F5BD35',
  white: '#FFFFFF',
  background: '#F5F7FA',
  text: '#172B4D',
  muted: '#697586',
  border: '#E1E7EF',
  paleGold: '#FFF4D5',
  green: '#18794E',
};

const CATEGORIES = [
  'Tecnologia',
  'Educação',
  'Agricultura',
  'Empreendedorismo',
  'Ambiente',
  'Comunidade',
  'Saúde',
  'Outros',
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

  const [ideaImageUri, setIdeaImageUri] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let mounted = true;

    async function initialise() {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) throw error;
        if (mounted) setUser(data.session?.user ?? null);
      } catch (error) {
        if (mounted) setNotice(error.message || 'Não foi possível verificar a sessão.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initialise();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    loadData();
  }, [user?.id]);

  async function loadData() {
    setLoading(true);
    setNotice('');

    try {
      const [
        ideasResult,
        projectsResult,
        challengesResult,
      ] = await Promise.all([
        supabase
          .from('ideas')
          .select('id, author_id, title, description, category, status, image_url, created_at')
          .order('created_at', { ascending: false })
          .limit(100),

        supabase
          .from('projects')
          .select('id, creator_id, title, description, province, status, created_at')
          .order('created_at', { ascending: false })
          .limit(100),

        supabase
          .from('challenges')
          .select('id, creator_id, title, description, category, status, deadline, created_at')
          .order('created_at', { ascending: false })
          .limit(100),
      ]);

      if (ideasResult.error) throw ideasResult.error;
      if (projectsResult.error) throw projectsResult.error;
      if (challengesResult.error) throw challengesResult.error;

      setIdeas(ideasResult.data || []);
      setProjects(projectsResult.data || []);
      setChallenges(challengesResult.data || []);
    } catch (error) {
      setNotice(error.message || 'Não foi possível carregar os conteúdos.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAuth() {
    setNotice('');

    if (!email.trim() || !password) {
      setNotice('Introduz o teu email e a palavra-passe.');
      return;
    }

    if (isRegister && !displayName.trim()) {
      setNotice('Introduz o teu nome.');
      return;
    }

    setSaving(true);

    try {
      if (isRegister) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              display_name: displayName.trim(),
            },
          },
        });

        if (error) throw error;

        if (data.user && data.session) {
          await saveProfile(data.user, displayName.trim());
          setNotice('Conta criada com sucesso.');
        } else {
          setNotice('Conta criada. Confirma o teu email para concluir o registo.');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;
        setNotice('Sessão iniciada com sucesso.');
      }
    } catch (error) {
      setNotice(error.message || 'Não foi possível autenticar.');
    } finally {
      setSaving(false);
    }
  }

  async function saveProfile(authUser, name) {
    const { error } = await supabase.from('profiles').upsert(
      {
        id: authUser.id,
        display_name: name || authUser.user_metadata?.display_name || '',
        username: authUser.user_metadata?.username || null,
      },
      { onConflict: 'id' }
    );

    if (error) throw error;
  }

  async function logout() {
    setSaving(true);

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setNotice('Sessão terminada.');
      setScreen('Inicio');
    } catch (error) {
      setNotice(error.message || 'Não foi possível terminar a sessão.');
    } finally {
      setSaving(false);
    }
  }

  async function selectIdeaImage() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        setNotice('Permite o acesso à galeria para escolher uma imagem.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length) {
        setIdeaImageUri(result.assets[0].uri);
        setNotice('');
      }
    } catch (error) {
      setNotice(error.message || 'Não foi possível abrir a galeria.');
    }
  }

  async function publishIdea() {
    if (!user) {
      setNotice('Inicia sessão para publicar uma ideia.');
      setScreen('Perfil');
      return;
    }

    if (!title.trim() || !description.trim()) {
      setNotice('Preenche o título e a descrição da ideia.');
      return;
    }

    setSaving(true);
    setNotice('');

    try {
      let imageUrl = null;

      if (ideaImageUri) {
        setNotice('A enviar a imagem...');
        const uploaded = await uploadImage(ideaImageUri, 'ideas');
        imageUrl = uploaded.url;
      }

      const { error } = await supabase.from('ideas').insert({
        author_id: user.id,
        title: title.trim(),
        description: description.trim(),
        category: category.trim() || null,
        status: 'open',
        image_url: imageUrl,
      });

      if (error) throw error;

      setTitle('');
      setDescription('');
      setCategory('');
      setIdeaImageUri(null);

      await loadData();
      setNotice('Ideia publicada com sucesso.');
      setScreen('Inicio');
    } catch (error) {
      setNotice(error.message || 'Não foi possível publicar a ideia.');
    } finally {
      setSaving(false);
    }
  }

  const filteredIdeas = ideas.filter((idea) => {
    const text = `${idea.title || ''} ${idea.description || ''} ${idea.category || ''}`;
    return text.toLowerCase().includes(search.toLowerCase());
  });

  function Header() {
    return (
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setScreen('Inicio')}>
          <Text style={styles.logo}>KONECTA</Text>
          <Text style={styles.tagline}>Ideias que unem. Pessoas que realizam.</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => setScreen('Perfil')}
        >
          <Text style={styles.profileButtonText}>
            {user ? 'Perfil' : 'Entrar'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  function Notice() {
    if (!notice) return null;

    return (
      <TouchableOpacity
        style={styles.notice}
        onPress={() => setNotice('')}
      >
        <Text style={styles.noticeText}>{notice}</Text>
      </TouchableOpacity>
    );
  }

  function IdeaCard({ idea }) {
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.categoryBadge}>
            {idea.category || 'Ideia da comunidade'}
          </Text>
          <Text style={styles.statusText}>
            {idea.status === 'open' ? 'Aberta' : idea.status}
          </Text>
        </View>

        <Text style={styles.cardTitle}>{idea.title}</Text>

        {idea.image_url ? (
          <Image
            source={{ uri: idea.image_url }}
            style={styles.ideaImage}
            resizeMode="cover"
          />
        ) : null}

        <Text style={styles.cardDescription}>{idea.description}</Text>

        <Text style={styles.cardMeta}>
          Publicada em{' '}
          {idea.created_at
            ? new Date(idea.created_at).toLocaleDateString()
            : 'data indisponível'}
        </Text>
      </View>
    );
  }

  function ProjectCard({ project }) {
    return (
      <View style={styles.card}>
        <Text style={styles.categoryBadge}>Projeto</Text>
        <Text style={styles.cardTitle}>{project.title}</Text>
        <Text style={styles.cardDescription}>{project.description}</Text>
        {project.province ? (
          <Text style={styles.cardMeta}>{project.province}</Text>
        ) : null}
        <Text style={styles.cardMeta}>Estado: {project.status}</Text>
      </View>
    );
  }

  function ChallengeCard({ challenge }) {
    return (
      <View style={styles.card}>
        <Text style={styles.categoryBadge}>
          {challenge.category || 'Desafio comunitário'}
        </Text>
        <Text style={styles.cardTitle}>{challenge.title}</Text>
        <Text style={styles.cardDescription}>{challenge.description}</Text>
        <Text style={styles.cardMeta}>Estado: {challenge.status}</Text>
        {challenge.deadline ? (
          <Text style={styles.cardMeta}>
            Prazo: {new Date(challenge.deadline).toLocaleDateString()}
          </Text>
        ) : null}
      </View>
    );
  }

  function CreateScreen() {
    return (
      <View style={styles.section}>
        <Text style={styles.heading}>Partilha uma ideia</Text>
        <Text style={styles.subheading}>
          Uma ideia pode ser o início de uma solução para a tua comunidade.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Título da ideia"
          placeholderTextColor={COLORS.muted}
          value={title}
          onChangeText={setTitle}
          maxLength={120}
        />

        <TextInput
          style={[styles.input, styles.multilineInput]}
          placeholder="Explica a tua ideia..."
          placeholderTextColor={COLORS.muted}
          value={description}
          onChangeText={setDescription}
          multiline
          textAlignVertical="top"
          maxLength={5000}
        />

        <Text style={styles.fieldLabel}>Categoria</Text>
        <View style={styles.categoryList}>
          {CATEGORIES.map((item) => (
            <TouchableOpacity
              key={item}
              style={[
                styles.categoryOption,
                category === item && styles.categoryOptionSelected,
              ]}
              onPress={() => setCategory(category === item ? '' : item)}
            >
              <Text
                style={[
                  styles.categoryOptionText,
                  category === item && styles.categoryOptionTextSelected,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.imageButton}
          onPress={selectIdeaImage}
          disabled={saving}
        >
          <Text style={styles.imageButtonText}>
            {ideaImageUri ? 'Escolher outra imagem' : '+ Adicionar imagem'}
          </Text>
        </TouchableOpacity>

        {ideaImageUri ? (
          <View>
            <Image
              source={{ uri: ideaImageUri }}
              style={styles.ideaPreview}
              resizeMode="cover"
            />
            <TouchableOpacity onPress={() => setIdeaImageUri(null)}>
              <Text style={styles.removeImage}>Remover imagem</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.primaryButton, saving && styles.disabledButton]}
          onPress={publishIdea}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={COLORS.navy} />
          ) : (
            <Text style={styles.primaryButtonText}>Publicar ideia</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  function ProfileScreen() {
    if (!user) {
      return (
        <View style={styles.section}>
          <Text style={styles.heading}>
            {isRegister ? 'Criar conta' : 'Bem-vindo ao KONECTA'}
          </Text>
          <Text style={styles.subheading}>
            Entra na comunidade para partilhar ideias e colaborar em projetos.
          </Text>

          {isRegister ? (
            <TextInput
              style={styles.input}
              placeholder="O teu nome"
              placeholderTextColor={COLORS.muted}
              value={displayName}
              onChangeText={setDisplayName}
            />
          ) : null}

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={COLORS.muted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="Palavra-passe"
            placeholderTextColor={COLORS.muted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.primaryButton, saving && styles.disabledButton]}
            onPress={handleAuth}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={COLORS.navy} />
            ) : (
              <Text style={styles.primaryButtonText}>
                {isRegister ? 'Criar conta' : 'Entrar'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchAuth}
            onPress={() => setIsRegister(!isRegister)}
          >
            <Text style={styles.linkText}>
              {isRegister
                ? 'Já tens conta? Entrar'
                : 'Ainda não tens conta? Criar conta'}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <Text style={styles.heading}>O teu perfil</Text>
        <Text style={styles.profileEmail}>{user.email}</Text>
        <Text style={styles.subheading}>
          Continua a partilhar ideias e a colaborar com a comunidade.
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>
              {ideas.filter((idea) => idea.author_id === user.id).length}
            </Text>
            <Text style={styles.statLabel}>Ideias carregadas</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>
              {projects.filter((project) => project.creator_id === user.id).length}
            </Text>
            <Text style={styles.statLabel}>Projetos carregados</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={loadData}
          disabled={loading}
        >
          <Text style={styles.secondaryButtonText}>Atualizar conteúdos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={logout}
          disabled={saving}
        >
          <Text style={styles.logoutText}>Terminar sessão</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function HomeScreen() {
    return (
      <View style={styles.section}>
        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>A comunidade começa contigo</Text>
          <Text style={styles.heroTitle}>
            Boas ideias merecem pessoas que as realizem.
          </Text>
          <Text style={styles.heroDescription}>
            Descobre ideias, participa em desafios e encontra pessoas com vontade
            de construir soluções em conjunto.
          </Text>

          <TouchableOpacity
            style={styles.heroButton}
            onPress={() => setScreen(user ? 'Criar' : 'Perfil')}
          >
            <Text style={styles.heroButtonText}>Partilhar uma ideia</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.heading}>Ideias da comunidade</Text>

        <TextInput
          style={styles.input}
          placeholder="Pesquisar ideias..."
          placeholderTextColor={COLORS.muted}
          value={search}
          onChangeText={setSearch}
        />

        {loading ? (
          <ActivityIndicator
            size="large"
            color={COLORS.navy}
            style={styles.loader}
          />
        ) : filteredIdeas.length ? (
          filteredIdeas.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} />
          ))
        ) : (
          <EmptyState
            title="Ainda não há ideias para mostrar"
            description="Sê uma das primeiras pessoas a partilhar uma ideia com a comunidade."
            action="Criar uma ideia"
            onPress={() => setScreen(user ? 'Criar' : 'Perfil')}
          />
        )}

        <TouchableOpacity style={styles.refreshButton} onPress={loadData}>
          <Text style={styles.linkText}>Atualizar conteúdos</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function DiscoverScreen() {
    return (
      <View style={styles.section}>
        <Text style={styles.heading}>Descobrir</Text>
        <Text style={styles.subheading}>
          Explora desafios e ideias que podem inspirar novas soluções.
        </Text>

        <Text style={styles.sectionTitle}>Desafios</Text>
        {challenges.length ? (
          challenges.map((challenge) => (
            <ChallengeCard key={challenge.id} challenge={challenge} />
          ))
        ) : (
          <EmptyState
            title="Sem desafios publicados"
            description="Os desafios da comunidade aparecerão aqui quando forem criados."
          />
        )}

        <Text style={styles.sectionTitle}>Ideias</Text>
        {filteredIdeas.length ? (
          filteredIdeas.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} />
          ))
        ) : (
          <EmptyState
            title="Sem ideias disponíveis"
            description="Experimenta pesquisar novamente mais tarde."
          />
        )}
      </View>
    );
  }

  function ProjectsScreen() {
    return (
      <View style={styles.section}>
        <Text style={styles.heading}>Projetos</Text>
        <Text style={styles.subheading}>
          Descobre iniciativas e projetos partilhados pela comunidade.
        </Text>

        {projects.length ? (
          projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))
        ) : (
          <EmptyState
            title="Ainda não há projetos"
            description="Os projetos disponíveis serão apresentados aqui."
          />
        )}

        <TouchableOpacity style={styles.refreshButton} onPress={loadData}>
          <Text style={styles.linkText}>Atualizar projetos</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function EmptyState({ title: emptyTitle, description, action, onPress }) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>{emptyTitle}</Text>
        <Text style={styles.emptyDescription}>{description}</Text>
        {action && onPress ? (
          <TouchableOpacity style={styles.secondaryButton} onPress={onPress}>
            <Text style={styles.secondaryButtonText}>{action}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
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

  if (loading && !user && !ideas.length && !projects.length && !challenges.length) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.navy} />
        <Text style={styles.loadingLogo}>KONECTA</Text>
        <ActivityIndicator size="large" color={COLORS.gold} />
        <Text style={styles.loadingText}>A preparar a comunidade...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.navy} />

      <Header />
      <Notice />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {renderScreen()}
      </ScrollView>

      <View style={styles.bottomNav}>
        {['Inicio', 'Descobrir', 'Criar', 'Projetos', 'Perfil'].map((item) => (
          <TouchableOpacity
            key={item}
            style={[styles.navItem, screen === item && styles.navItemActive]}
            onPress={() => {
              if (item === 'Criar' && !user) {
                setScreen('Perfil');
                setNotice('Inicia sessão para publicar uma ideia.');
              } else {
                setScreen(item);
                setNotice('');
              }
            }}
          >
            <Text
              style={[
                styles.navText,
                screen === item && styles.navTextActive,
              ]}
            >
              {item === 'Inicio'
                ? 'Início'
                : item === 'Descobrir'
                ? 'Descobrir'
                : item === 'Criar'
                ? '+ Criar'
                : item}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: COLORS.navy,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingLogo: {
    color: COLORS.gold,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 24,
  },
  loadingText: {
    color: COLORS.white,
    marginTop: 14,
  },
  header: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: 18,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  tagline: {
    color: '#D8E2F0',
    fontSize: 10,
    marginTop: 3,
  },
  profileButton: {
    backgroundColor: COLORS.gold,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
  },
  profileButtonText: {
    color: COLORS.navy,
    fontWeight: '800',
  },
  notice: {
    backgroundColor: COLORS.paleGold,
    marginHorizontal: 12,
    marginTop: 10,
    padding: 11,
    borderRadius: 10,
  },
  noticeText: {
    color: COLORS.navy,
    fontSize: 13,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 24,
  },
  section: {
    padding: 16,
  },
  hero: {
    backgroundColor: COLORS.navy,
    borderRadius: 20,
    padding: 22,
    marginBottom: 24,
  },
  heroEyebrow: {
    color: COLORS.gold,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  heroTitle: {
    color: COLORS.white,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
    marginBottom: 12,
  },
  heroDescription: {
    color: '#E1E8F2',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 20,
  },
  heroButton: {
    backgroundColor: COLORS.gold,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  heroButtonText: {
    color: COLORS.navy,
    fontWeight: '900',
  },
  heading: {
    color: COLORS.navy,
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 8,
  },
  subheading: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 18,
  },
  sectionTitle: {
    color: COLORS.navy,
    fontSize: 19,
    fontWeight: '800',
    marginTop: 20,
    marginBottom: 12,
  },
  fieldLabel: {
    color: COLORS.text,
    fontWeight: '700',
    marginBottom: 10,
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: COLORS.text,
    fontSize: 15,
    marginBottom: 14,
  },
  multilineInput: {
    minHeight: 130,
    paddingTop: 14,
  },
  categoryList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  categoryOption: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
    marginBottom: 8,
  },
  categoryOptionSelected: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.navy,
  },
  categoryOptionText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
  },
  categoryOptionTextSelected: {
    color: COLORS.white,
  },
  imageButton: {
    backgroundColor: COLORS.paleGold,
    padding: 14,
    borderRadius: 11,
    alignItems: 'center',
    marginBottom: 14,
  },
  imageButtonText: {
    color: COLORS.navy,
    fontWeight: '800',
  },
  ideaPreview: {
    width: '100%',
    height: 190,
    borderRadius: 12,
    marginBottom: 8,
  },
  ideaImage: {
    width: '100%',
    height: 210,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: COLORS.background,
  },
  removeImage: {
    color: '#B42318',
    fontWeight: '700',
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: COLORS.gold,
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  primaryButtonText: {
    color: COLORS.navy,
    fontWeight: '900',
    fontSize: 15,
  },
  disabledButton: {
    opacity: 0.6,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 16,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  categoryBadge: {
    color: COLORS.navy,
    backgroundColor: COLORS.paleGold,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    fontSize: 11,
    fontWeight: '800',
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  statusText: {
    color: COLORS.green,
    fontSize: 11,
    fontWeight: '800',
  },
  cardTitle: {
    color: COLORS.navy,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
  },
  cardDescription: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  cardMeta: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 10,
  },
  emptyState: {
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  emptyTitle: {
    color: COLORS.navy,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptyDescription: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: COLORS.navy,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 15,
  },
  secondaryButtonText: {
    color: COLORS.navy,
    fontWeight: '800',
  },
  refreshButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  linkText: {
    color: COLORS.navy,
    fontWeight: '800',
  },
  profileEmail: {
    color: COLORS.text,
    fontSize: 15,
    marginVertical: 8,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statNumber: {
    color: COLORS.navy,
    fontSize: 24,
    fontWeight: '900',
  },
  statLabel: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 5,
  },
  switchAuth: {
    alignItems: 'center',
    padding: 16,
  },
  logoutButton: {
    backgroundColor: '#FDE8E7',
    padding: 14,
    borderRadius: 11,
    alignItems: 'center',
    marginTop: 14,
  },
  logoutText: {
    color: '#B42318',
    fontWeight: '800',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 9,
    paddingBottom: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: 9,
  },
  navItemActive: {
    backgroundColor: COLORS.paleGold,
  },
  navText: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '700',
  },
  navTextActive: {
    color: COLORS.navy,
    fontWeight: '900',
  },
  loader: {
    marginTop: 24,
    marginBottom: 24,
  },
});
