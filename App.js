
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
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from './lib/supabase';
import { uploadImage } from './lib/cloudinary';

const C = {
  navy: '#102D57',
  gold: '#F5BD35',
  white: '#FFFFFF',
  background: '#F5F7FA',
  text: '#172B4D',
  muted: '#697586',
  border: '#E1E7EF',
  paleGold: '#FFF4D5',
  green: '#18794E',
  red: '#B42318',
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

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString();
}

export default function App() {
  const [screen, setScreen] = useState('Inicio');
  const [user, setUser] = useState(null);

  const [ideas, setIdeas] = useState([]);
  const [projects, setProjects] = useState([]);
  const [challenges, setChallenges] = useState([]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [ideaImageUri, setIdeaImageUri] = useState(null);
  const [search, setSearch] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isRegister, setIsRegister] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;

    async function initialise() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (active) {
          setUser(data.session?.user ?? null);
        }
      } catch (error) {
        if (active) {
          setNotice(error.message || 'Não foi possível verificar a sessão.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    initialise();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    loadData();
  }, [user?.id]);

  async function loadData() {
    setLoading(true);

    try {
      const [ideasResult, projectsResult, challengesResult] =
        await Promise.all([
          supabase
            .from('ideas')
            .select(
              'id, author_id, title, description, category, status, image_url, created_at'
            )
            .order('created_at', { ascending: false })
            .limit(100),

          supabase
            .from('projects')
            .select(
              'id, creator_id, title, description, province, status, created_at'
            )
            .order('created_at', { ascending: false })
            .limit(100),

          supabase
            .from('challenges')
            .select(
              'id, creator_id, title, description, category, status, deadline, created_at'
            )
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
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert(
              {
                id: data.user.id,
                display_name: displayName.trim(),
              },
              { onConflict: 'id' }
            );

          if (profileError) throw profileError;

          setNotice('Conta criada com sucesso.');
        } else {
          setNotice(
            'Conta criada. Confirma o teu email para concluir o registo.'
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        setNotice('Sessão iniciada com sucesso.');
        setScreen('Inicio');
      }
    } catch (error) {
      setNotice(error.message || 'Não foi possível autenticar.');
    } finally {
      setSaving(false);
    }
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
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

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

      if (!result.canceled && result.assets?.[0]?.uri) {
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
        category: category || null,
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
    const value = [
      idea.title,
      idea.description,
      idea.category,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return value.includes(search.trim().toLowerCase());
  });

  function Header() {
    return (
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setScreen('Inicio')}>
          <Text style={styles.logo}>KONECTA</Text>
          <Text style={styles.tagline}>
            Ideias que unem. Pessoas que realizam.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => setScreen('Perfil')}
        >
          <Text style={styles.headerButtonText}>
            {user ? 'Meu perfil' : 'Entrar'}
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
        accessibilityRole="button"
      >
        <Text style={styles.noticeText}>{notice}</Text>
        <Text style={styles.noticeDismiss}>Fechar</Text>
      </TouchableOpacity>
    );
  }

  function EmptyState({ title: heading, description: detail, action, onPress }) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>{heading}</Text>
        <Text style={styles.emptyText}>{detail}</Text>

        {action && onPress ? (
          <TouchableOpacity style={styles.outlineButton} onPress={onPress}>
            <Text style={styles.outlineButtonText}>{action}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  function IdeaCard({ idea }) {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.badge}>
            {idea.category || 'Ideia da comunidade'}
          </Text>
          <Text style={styles.status}>
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

        <Text style={styles.meta}>
          {formatDate(idea.created_at)}
        </Text>
      </View>
    );
  }

  function ProjectCard({ project }) {
    return (
      <View style={styles.card}>
        <Text style={styles.badge}>Projeto</Text>
        <Text style={styles.cardTitle}>{project.title}</Text>
        <Text style={styles.cardDescription}>{project.description}</Text>
        {project.province ? (
          <Text style={styles.meta}>{project.province}</Text>
        ) : null}
        <Text style={styles.meta}>Estado: {project.status}</Text>
      </View>
    );
  }

  function ChallengeCard({ challenge }) {
    return (
      <View style={styles.card}>
        <Text style={styles.badge}>
          {challenge.category || 'Desafio comunitário'}
        </Text>
        <Text style={styles.cardTitle}>{challenge.title}</Text>
        <Text style={styles.cardDescription}>{challenge.description}</Text>
        <Text style={styles.meta}>Estado: {challenge.status}</Text>
        {challenge.deadline ? (
          <Text style={styles.meta}>
            Prazo: {formatDate(challenge.deadline)}
          </Text>
        ) : null}
      </View>
    );
  }

  function HomeScreen() {
    return (
      <View style={styles.section}>
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>A comunidade começa contigo</Text>
          <Text style={styles.heroTitle}>
            Boas ideias merecem pessoas que as realizem.
          </Text>
          <Text style={styles.heroText}>
            Descobre ideias, participa em desafios e encontra pessoas
            com vontade de construir soluções em conjunto.
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
          placeholderTextColor={C.muted}
          value={search}
          onChangeText={setSearch}
        />

        {loading ? (
          <ActivityIndicator
            color={C.navy}
            size="large"
            style={styles.loader}
          />
        ) : filteredIdeas.length ? (
          filteredIdeas.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} />
          ))
        ) : (
          <EmptyState
            title="Ainda não há ideias para mostrar"
            description="Partilha a primeira ideia e inspira a comunidade."
            action="Criar uma ideia"
            onPress={() => setScreen(user ? 'Criar' : 'Perfil')}
          />
        )}

        <TouchableOpacity style={styles.refresh} onPress={loadData}>
          <Text style={styles.link}>Atualizar conteúdos</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function DiscoverScreen() {
    return (
      <View style={styles.section}>
        <Text style={styles.heading}>Descobrir</Text>
        <Text style={styles.subtitle}>
          Explora iniciativas e desafios partilhados pela comunidade.
        </Text>

        <Text style={styles.sectionHeading}>Desafios</Text>

        {challenges.length ? (
          challenges.map((item) => (
            <ChallengeCard key={item.id} challenge={item} />
          ))
        ) : (
          <EmptyState
            title="Sem desafios publicados"
            description="Os desafios aparecerão aqui quando existirem."
          />
        )}

        <Text style={styles.sectionHeading}>Ideias</Text>

        {filteredIdeas.length ? (
          filteredIdeas.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} />
          ))
        ) : (
          <EmptyState
            title="Sem ideias disponíveis"
            description="Tenta novamente mais tarde."
          />
        )}
      </View>
    );
  }

  function ProjectsScreen() {
    return (
      <View style={styles.section}>
        <Text style={styles.heading}>Projetos</Text>
        <Text style={styles.subtitle}>
          Descobre iniciativas e projetos da comunidade.
        </Text>

        {projects.length ? (
          projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))
        ) : (
          <EmptyState
            title="Ainda não há projetos"
            description="Os projetos publicados serão apresentados aqui."
          />
        )}

        <TouchableOpacity style={styles.refresh} onPress={loadData}>
          <Text style={styles.link}>Atualizar projetos</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function CreateScreen() {
    return (
      <View style={styles.section}>
        <Text style={styles.heading}>Partilhar uma ideia</Text>
        <Text style={styles.subtitle}>
          Explica a tua ideia e ajuda a transformar boas propostas em soluções.
        </Text>

        <Text style={styles.fieldLabel}>Título</Text>
        <TextInput
          style={styles.input}
          placeholder="Qual é a tua ideia?"
          placeholderTextColor={C.muted}
          value={title}
          onChangeText={setTitle}
          maxLength={120}
        />

        <Text style={styles.fieldLabel}>Descrição</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="Explica como funciona e que problema pode resolver..."
          placeholderTextColor={C.muted}
          value={description}
          onChangeText={setDescription}
          multiline
          textAlignVertical="top"
          maxLength={5000}
        />

        <Text style={styles.fieldLabel}>Categoria</Text>
        <View style={styles.categories}>
          {CATEGORIES.map((item) => (
            <TouchableOpacity
              key={item}
              style={[
                styles.categoryOption,
                category === item && styles.categorySelected,
              ]}
              onPress={() =>
                setCategory(category === item ? '' : item)
              }
            >
              <Text
                style={[
                  styles.categoryText,
                  category === item && styles.categoryTextSelected,
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
              style={styles.preview}
              resizeMode="cover"
            />
            <TouchableOpacity onPress={() => setIdeaImageUri(null)}>
              <Text style={styles.removeImage}>Remover imagem</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.primaryButton, saving && styles.disabled]}
          onPress={publishIdea}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={C.navy} />
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
            {isRegister ? 'Criar conta' : 'Entrar no KONECTA'}
          </Text>
          <Text style={styles.subtitle}>
            Junta-te à comunidade para partilhar ideias e colaborar.
          </Text>

          {isRegister ? (
            <>
              <Text style={styles.fieldLabel}>Nome</Text>
              <TextInput
                style={styles.input}
                placeholder="O teu nome"
                placeholderTextColor={C.muted}
                value={displayName}
                onChangeText={setDisplayName}
              />
            </>
          ) : null}

          <Text style={styles.fieldLabel}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="nome@exemplo.com"
            placeholderTextColor={C.muted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.fieldLabel}>Palavra-passe</Text>
          <TextInput
            style={styles.input}
            placeholder="Introduz a palavra-passe"
            placeholderTextColor={C.muted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.primaryButton, saving && styles.disabled]}
            onPress={handleAuth}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={C.navy} />
            ) : (
              <Text style={styles.primaryButtonText}>
                {isRegister ? 'Criar conta' : 'Entrar'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchAuth}
            onPress={() => {
              setIsRegister(!isRegister);
              setNotice('');
            }}
          >
            <Text style={styles.link}>
              {isRegister
                ? 'Já tens conta? Entrar'
                : 'Ainda não tens conta? Criar conta'}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    const myIdeas = ideas.filter((item) => item.author_id === user.id);
    const myProjects = projects.filter(
      (item) => item.creator_id === user.id
    );

    return (
      <View style={styles.section}>
        <Text style={styles.heading}>O teu perfil</Text>
        <Text style={styles.profileEmail}>{user.email}</Text>
        <Text style={styles.subtitle}>
          Continua a partilhar ideias e a colaborar com a comunidade.
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{myIdeas.length}</Text>
            <Text style={styles.statLabel}>Ideias carregadas</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{myProjects.length}</Text>
            <Text style={styles.statLabel}>Projetos carregados</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.outlineButton}
          onPress={loadData}
          disabled={loading}
        >
          <Text style={styles.outlineButtonText}>
            Atualizar conteúdos
          </Text>
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

  function renderScreen() {
    if (screen === 'Descobrir') return <DiscoverScreen />;
    if (screen === 'Criar') return <CreateScreen />;
    if (screen === 'Projetos') return <ProjectsScreen />;
    if (screen === 'Perfil') return <ProfileScreen />;
    return <HomeScreen />;
  }

  if (loading && !ideas.length && !projects.length && !challenges.length) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={C.navy}
        />
        <Text style={styles.loadingLogo}>KONECTA</Text>
        <ActivityIndicator color={C.gold} size="large" />
        <Text style={styles.loadingText}>A preparar a comunidade...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

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
        {['Inicio', 'Descobrir', 'Criar', 'Projetos', 'Perfil'].map(
          (item) => (
            <TouchableOpacity
              key={item}
              style={[
                styles.navItem,
                screen === item && styles.navItemActive,
              ]}
              onPress={() => {
                if (item === 'Criar' && !user) {
                  setScreen('Perfil');
                  setNotice('Inicia sessão para publicar uma ideia.');
                  return;
                }

                setScreen(item);
                setNotice('');
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
                  : item === 'Criar'
                  ? '+ Criar'
                  : item}
              </Text>
            </TouchableOpacity>
          )
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.background,
    ...(Platform.OS === 'web' ? { minHeight: '100vh' } : {}),
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: C.navy,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingLogo: {
    color: C.gold,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 24,
  },
  loadingText: {
    color: C.white,
    marginTop: 14,
  },
  header: {
    backgroundColor: C.navy,
    paddingHorizontal: 18,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    color: C.white,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  tagline: {
    color: '#D8E2F0',
    fontSize: 10,
    marginTop: 3,
  },
  headerButton: {
    backgroundColor: C.gold,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
  },
  headerButtonText: {
    color: C.navy,
    fontWeight: '900',
  },
  notice: {
    backgroundColor: C.paleGold,
    marginHorizontal: 12,
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
  },
  noticeText: {
    color: C.navy,
    fontSize: 13,
  },
  noticeDismiss: {
    color: C.muted,
    fontSize: 11,
    marginTop: 5,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 24,
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
  },
  section: {
    padding: 16,
  },
  hero: {
    backgroundColor: C.navy,
    borderRadius: 20,
    padding: 24,
    marginBottom: 25,
  },
  heroLabel: {
    color: C.gold,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  heroTitle: {
    color: C.white,
    fontSize: 30,
    lineHeight: 37,
    fontWeight: '900',
    marginBottom: 14,
  },
  heroText: {
    color: '#E1E8F2',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 22,
  },
  heroButton: {
    backgroundColor: C.gold,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  heroButtonText: {
    color: C.navy,
    fontWeight: '900',
  },
  heading: {
    color: C.navy,
    fontSize: 25,
    fontWeight: '900',
    marginBottom: 9,
  },
  subtitle: {
    color: C.muted,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 19,
  },
  sectionHeading: {
    color: C.navy,
    fontSize: 19,
    fontWeight: '900',
    marginTop: 20,
    marginBottom: 12,
  },
  fieldLabel: {
    color: C.text,
    fontWeight: '800',
    marginBottom: 8,
  },
  input: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: C.text,
    fontSize: 15,
    marginBottom: 15,
    width: '100%',
  },
  multiline: {
    minHeight: 130,
    paddingTop: 14,
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  categoryOption: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    marginRight: 8,
    marginBottom: 8,
  },
  categorySelected: {
    backgroundColor: C.navy,
    borderColor: C.navy,
  },
  categoryText: {
    color: C.text,
    fontSize: 12,
    fontWeight: '700',
  },
  categoryTextSelected: {
    color: C.white,
  },
  imageButton: {
    backgroundColor: C.paleGold,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  imageButtonText: {
    color: C.navy,
    fontWeight: '900',
  },
  preview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 8,
  },
  ideaImage: {
    width: '100%',
    height: 230,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: C.background,
  },
  removeImage: {
    color: C.red,
    fontWeight: '800',
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: C.gold,
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  primaryButtonText: {
    color: C.navy,
    fontWeight: '900',
    fontSize: 15,
  },
  disabled: {
    opacity: 0.6,
  },
  card: {
    backgroundColor: C.white,
    borderRadius: 15,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  badge: {
    color: C.navy,
    backgroundColor: C.paleGold,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    fontSize: 11,
    fontWeight: '900',
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  status: {
    color: C.green,
    fontSize: 11,
    fontWeight: '900',
  },
  cardTitle: {
    color: C.navy,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 25,
  },
  cardDescription: {
    color: C.text,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
  meta: {
    color: C.muted,
    fontSize: 11,
    marginTop: 10,
  },
  empty: {
    backgroundColor: C.white,
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 14,
  },
  emptyTitle: {
    color: C.navy,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 8,
  },
  emptyText: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: C.navy,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 15,
  },
  outlineButtonText: {
    color: C.navy,
    fontWeight: '900',
  },
  refresh: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  link: {
    color: C.navy,
    fontWeight: '900',
  },
  profileEmail: {
    color: C.text,
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
    backgroundColor: C.white,
    padding: 16,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  statNumber: {
    color: C.navy,
    fontSize: 24,
    fontWeight: '900',
  },
  statLabel: {
    color: C.muted,
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
    color: C.red,
    fontWeight: '900',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 8,
    paddingBottom: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 2,
    borderRadius: 9,
  },
  navItemActive: {
    backgroundColor: C.paleGold,
  },
  navText: {
    color: C.muted,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  navTextActive: {
    color: C.navy,
    fontWeight: '900',
  },
  loader: {
    marginTop: 24,
    marginBottom: 24,
  },
});
