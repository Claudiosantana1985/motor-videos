function Privacidade() {
  const estiloTitulo = {
    color: '#111111',
    opacity: 1,
    textShadow: 'none',
    WebkitTextFillColor: '#111111',
  }

  return (
    <main
      style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: '40px 24px',
        lineHeight: '1.7',
        backgroundColor: '#ffffff',
        color: '#111111',
        minHeight: '100vh',
        textAlign: 'left',
      }}
    >
      <h1 style={estiloTitulo}>Política de Privacidade</h1>

      <p>
        <strong>Última atualização:</strong> 1 de outubro de 2026
      </p>

      <p>
        Esta Política de Privacidade descreve como o Motor de Vídeos
        trata informações relacionadas à utilização da plataforma e
        às integrações com serviços de terceiros.
      </p>

      <h2 style={estiloTitulo}>1. Informações tratadas</h2>

      <p>
        O Motor de Vídeos poderá tratar informações necessárias para
        fornecer suas funcionalidades, incluindo informações de conta,
        dados fornecidos pelo usuário, configurações de publicação e
        informações relacionadas aos conteúdos gerenciados pela
        plataforma.
      </p>

      <h2 style={estiloTitulo}>2. Integrações com terceiros</h2>

      <p>
        Quando o usuário conecta o Motor de Vídeos a serviços ou redes
        sociais de terceiros, determinadas informações poderão ser
        recebidas ou transmitidas conforme as permissões concedidas
        pelo próprio usuário e as regras da plataforma integrada.
      </p>

      <h2 style={estiloTitulo}>3. Finalidade do tratamento</h2>

      <p>
        As informações são utilizadas para disponibilizar e operar as
        funcionalidades do Motor de Vídeos, incluindo organização,
        gerenciamento, agendamento e publicação de conteúdos quando
        essas funcionalidades estiverem disponíveis e autorizadas.
      </p>

      <h2 style={estiloTitulo}>4. Compartilhamento de informações</h2>

      <p>
        O Motor de Vídeos não comercializa dados pessoais dos usuários.
        Informações poderão ser transmitidas a serviços de terceiros
        quando isso for necessário para executar uma funcionalidade
        solicitada e autorizada pelo usuário.
      </p>

      <h2 style={estiloTitulo}>5. Segurança</h2>

      <p>
        São adotadas medidas técnicas e organizacionais destinadas a
        proteger as informações utilizadas pela plataforma contra
        acesso, alteração, divulgação ou utilização não autorizada.
      </p>

      <h2 style={estiloTitulo}>6. Controle do usuário</h2>

      <p>
        O usuário poderá deixar de utilizar integrações externas ou
        revogar permissões concedidas por meio das configurações
        disponibilizadas pelos respectivos serviços de terceiros.
      </p>

      <h2 style={estiloTitulo}>7. Retenção e exclusão</h2>

      <p>
        As informações serão mantidas somente pelo período necessário
        para as finalidades para as quais forem utilizadas ou conforme
        exigido pela legislação aplicável. Solicitações relacionadas
        à exclusão de dados poderão ser realizadas pelos canais de
        contato disponibilizados pelo Motor de Vídeos.
      </p>

      <h2 style={estiloTitulo}>8. Alterações desta política</h2>

      <p>
        Esta Política de Privacidade poderá ser atualizada
        periodicamente. A versão mais recente ficará disponível nesta
        página.
      </p>

      <h2 style={estiloTitulo}>9. Contato</h2>

      <p>
        Dúvidas ou solicitações relacionadas à privacidade e ao
        tratamento de informações poderão ser encaminhadas pelos
        canais de contato disponibilizados pelo Motor de Vídeos.
      </p>
    </main>
  )
}

export default Privacidade