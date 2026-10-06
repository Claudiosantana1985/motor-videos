import { execFile } from 'child_process'

export function obterDuracaoVideo(caminhoArquivo) {
  return new Promise((resolve, reject) => {
    execFile(
      'ffprobe',
      [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        caminhoArquivo,
      ],
      (error, stdout) => {
        if (error) {
          reject(error)
          return
        }

        const duracao = Number.parseFloat(
          stdout.trim(),
        )

        if (!Number.isFinite(duracao)) {
          reject(
            new Error(
              'Não foi possível identificar a duração do vídeo.',
            ),
          )
          return
        }

        resolve(duracao)
      },
    )
  })
}