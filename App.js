
import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
} from 'react-native';

const NAVY = '#102D57';
const GOLD = '#F5BD35';
const BG = '#F5F7FA';
const MUTED = '#64748B';

const INITIAL_IDEAS = [
  {
    id: '1',
    title: 'Como podemos melhorar a nossa comunidade?',
    description: 'Partilha propostas e encontra pessoas dispostas a colaborar.',
    category: 'Comunidade',
    supports: 12,
  },
  {
    id: '2',
    title: 'Criar soluções para os jovens',
    description: 'Vamos transformar ideias em projetos com impacto.',
    category: 'Inovação',
    supports: 8,
  },
];

const TABS = [
  { id: 'Inicio', icon: '⌂', label: 'Início' },
  { id: 'Descobrir', icon: '⌕', label: 'Descobrir' },
  { id: 'Criar', icon: '+', label: 'Criar' },
  { id: 'Projetos', icon: '▤', label: 'Projetos' },
  { id: 'Perfil', icon: '○', label: 'Perfil' },
];

export default function App() {
  const [screen, setScreen] = useState('Inicio');
  const [ideas, setIdeas] = useState(INITIAL_IDEAS);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');

  function publishIdea() {
    if (!title.trim()) {
      setNotice('Escreve o título da tua ideia primeiro.');
      return;
    }

    setIdeas(current => [
      {
        id: String(Date.now()),
        title: title.trim(),
        description: description.trim(),
        category: 'Nova ideia',
        supports: 0,
      },
      ...current,
    ]);

    setTitle('');
    setDescription('');
    setNotice('Ideia adicionada a esta sessão.');
    setScreen('Inicio');
  }

  function supportIdea(id) {
    setIdeas(current =>
      current.map(idea =>
        idea.id === id
          ? { ...idea, supports: idea.supports + 1 }
          : idea
      )
    );
  }

  const filteredIdeas = ideas.filter(idea =>
    `${idea.title} ${idea.description} ${idea.category}`
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
          onPress={() => {
            setNotice('As notificações serão ligadas na próxima etapa.');
          }}
        >
          <Text style={styles.notificationText}>♧</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function IdeaCard({ idea }) {
    return (
      <View style={styles.ideaCard}>
        <View style={styles.categoryRow}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{idea.category}</Text>
          </View>
          <Text style={styles.smallText}>Ideia</Text>
        </View>

        <Text style={styles.ideaTitle}>{idea.title}</Text>

        {!!idea.description && (
          <Text style={styles.ideaDescription}>
            {idea.description}
          </Text>
        )}

        <View style={styles.cardFooter}>
          <Text style={styles.supportCount}>
            {idea.supports} apoios
          </Text>
          <TouchableOpacity
            style={styles.supportButton}
            onPress={() => supportIdea(idea.id)}
          >
            <Text style={styles.supportButtonText}>+ Apoiar</Text>
          </TouchableOpacity>
        </View>
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
          onPress={() => setScreen('Criar')}
        >
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarLetter}>K</Text>
          </View>
          <Text style={styles.promptText}>Que ideia queres partilhar?</Text>
          <Text style={styles.promptPlus}>+</Text>
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ideias em destaque</Text>
          <TouchableOpacity onPress={() => setScreen('Descobrir')}>
            <Text style={styles.linkText}>Ver todas</Text>
          </TouchableOpacity>
        </View>

        {filteredIdeas.length ? (
          filteredIdeas.map(idea => (
            <IdeaCard key={idea.id} idea={idea} />
          ))
        ) : (
          <Text style={styles.emptyText}>Nenhuma ideia encontrada.</Text>
        )}
      </>
    );
  }

  function DiscoverScreen() {
    return (
      <>
        <Text style={styles.pageTitle}>Descobrir</Text>
        <Text style={styles.subtitle}>
          Encontra ideias e pessoas com objetivos semelhantes.
        </Text>

        <TextInput
          style={styles.input}
          value={search}
          onChangeText={setSearch}
          placeholder="Pesquisar ideias..."
          placeholderTextColor={MUTED}
        />

        <Text style={styles.sectionTitle}>Todas as ideias</Text>
        {filteredIdeas.map(idea => (
          <IdeaCard key={idea.id} idea={idea} />
        ))}

        <View style={styles.infoPanel}>
          <Text style={styles.infoTitle}>Desafios</Text>
          <Text style={styles.infoText}>
            Os desafios vão permitir definir objetivos, reunir participantes
            e votar em propostas.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setScreen('Desafios')}
          >
            <Text style={styles.primaryButtonText}>Explorar desafios</Text>
          </TouchableOpacity>
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

        <View style={styles.formCard}>
          <Text style={styles.label}>Título da ideia *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Ex.: Melhorar a nossa comunidade"
            placeholderTextColor={MUTED}
            maxLength={120}
          />

          <Text style={styles.label}>Descrição</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={description}
            onChangeText={setDescription}
            placeholder="Explica a tua ideia e como pode ser realizada..."
            placeholderTextColor={MUTED}
            multiline
            maxLength={2000}
          />

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={publishIdea}
          >
            <Text style={styles.primaryButtonText}>Publicar ideia</Text>
          </TouchableOpacity>

          {!!notice && <Text style={styles.notice}>{notice}</Text>}
        </View>
      </>
    );
  }

  function ChallengesScreen() {
    return (
      <>
        <Text style={styles.pageTitle}>Desafios</Text>
        <Text style={styles.subtitle}>
          Objetivos comuns, colaboração e resultados.
        </Text>

        <View style={styles.infoPanel}>
          <Text style={styles.challengeTag}>PARTICIPAÇÃO</Text>
          <Text style={styles.ideaTitle}>Resolve um problema local</Text>
          <Text style={styles.ideaDescription}>
            Identifica um problema da tua comunidade e reúne pessoas para
            desenvolver uma solução.
          </Text>
          <Text style={styles.smallText}>
            Demonstração visual — ainda não é um desafio publicado.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => setScreen('Criar')}
        >
          <Text style={styles.primaryButtonText}>Partilhar uma ideia</Text>
        </TouchableOpacity>
      </>
    );
  }

  function ProjectsScreen() {
    return (
      <>
        <Text style={styles.pageTitle}>Projetos</Text>
        <Text style={styles.subtitle}>
          Organiza ideias em equipas, tarefas e objetivos.
        </Text>
        <View style={styles.infoPanel}>
          <Text style={styles.infoTitle}>O próximo passo começa aqui</Text>
          <Text style={styles.infoText}>
            A área de projetos terá membros, tarefas, marcos e progresso
            partilhado, guardados na base de dados.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setScreen('Criar')}
          >
            <Text style={styles.primaryButtonText}>Começar com uma ideia</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  function ProfileScreen() {
    return (
      <>
        <Text style={styles.pageTitle}>O teu perfil</Text>
        <View style={styles.profileCard}>
          <View style={styles.largeAvatar}>
            <Text style={styles.largeAvatarText}>K</Text>
          </View>
          <Text style={styles.profileName}>Bem-vindo ao KONECTA</Text>
          <Text style={styles.subtitle}>
            O teu perfil pessoal será configurado quando o registo estiver ligado.
          </Text>
        </View>

        <View style={styles.infoPanel}>
          <Text style={styles.infoTitle}>A tua participação</Text>
          <Text style={styles.infoText}>
            As tuas ideias, projetos, equipas e contribuições aparecerão aqui.
          </Text>
        </View>
      </>
    );
  }

  function renderScreen() {
    switch (screen) {
      case 'Descobrir':
        return <DiscoverScreen />;
      case 'Criar':
        return <CreateScreen />;
      case 'Desafios':
        return <ChallengesScreen />;
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
        {!!notice && screen !== 'Criar' && (
          <TouchableOpacity onPress={() => setNotice('')}>
            <Text style={styles.notice}>{notice}  ×</Text>
          </TouchableOpacity>
        )}
        {renderScreen()}
      </ScrollView>

      <View style={styles.bottomNav}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={styles.navItem}
            onPress={() => {
              setScreen(tab.id);
              setNotice('');
            }}
          >
            <Text style={[
              styles.navIcon,
              screen === tab.id && styles.activeNavIcon,
            ]}>
              {tab.icon}
            </Text>
            <Text style={[
              styles.navLabel,
              screen === tab.id && styles.activeNavLabel,
            ]}>
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
  cardFooter: {
    borderTopWidth: 1, borderTopColor: '#EEF2F7', marginTop: 15,
    paddingTop: 12, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
  },
  supportCount: { color: MUTED, fontSize: 12 },
  supportButton: { backgroundColor: NAVY, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 9 },
  supportButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
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
  notice: { color: NAVY, backgroundColor: '#FFF4D5', padding: 12, borderRadius: 10, marginBottom: 12, fontSize: 12 },
  infoPanel: { backgroundColor: '#FFFFFF', padding: 18, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 14 },
  infoTitle: { color: NAVY, fontSize: 18, fontWeight: '800' },
  infoText: { color: MUTED, fontSize: 13, lineHeight: 21, marginTop: 8 },
  challengeTag: { color: '#916300', fontWeight: '800', fontSize: 11, marginBottom: 12 },
  emptyText: { color: MUTED, padding: 20, textAlign: 'center' },
  profileCard: { alignItems: 'center', padding: 22, backgroundColor: '#FFFFFF', borderRadius: 14, marginBottom: 14 },
  largeAvatar: { height: 76, width: 76, borderRadius: 38, backgroundColor: NAVY, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  largeAvatarText: { color: GOLD, fontSize: 30, fontWeight: '900' },
  profileName: { color: NAVY, fontSize: 18, fontWeight: '800', textAlign: 'center' },
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
