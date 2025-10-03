#!/usr/bin/env node

const { program } = require('commander')
const inquirer = require('inquirer').default
const fs = require('fs-extra')
const path = require('path')
const { execSync } = require('child_process')
const os = require('os')
const chalk = require('chalk').default
const simpleGit = require('simple-git');

// 版本信息
const version = "0.1.0.rc.1.alpha"

// 仓库源
const repoSources = {
    github: 'https://github.com/bil-fis/saruCanvas',
    gitee: 'https://gitee.com/lww090627/saruCanvas'
  }

// 配置命令
program
    .version(version, '-v, --version', '显示版本信息')
    .name('saru')
    .description('saruCanvas 命令行工具')

// create
program
    .command('create')
    .description('创建新的saruCanvas项目')
    .action(async () => {
        try {
            // 询问
            const answers = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'projectDir',
                    message: 'Project Directory / 项目路径',
                    default: '.'
                },
                {
                    type: 'input',
                    name: 'projectName',
                    message: 'Name / 名称',
                    default: 'sarucanvas'
                }
            ])

            const { projectDir, projectName } = answers;
            const targetDir = path.resolve(projectDir);

            // 确保目标目录存在
            await fs.ensureDir(targetDir);

            // 创建基础目录结构
            const dirs = [
                'sarucanvas/css',
                'sarucanvas/js',
                'assets/image',
                'assets/audio',
                'assets/scenes'
            ];

            for (const dir of dirs) {
                await fs.ensureDir(path.join(targetDir, dir));
            }

            // 克隆仓库
//            const gitRepo = 'https://github.com/bil-fis/saruCanvas'
            const tempCloneDir = path.join(os.tmpdir(), `sarucanvas-${Date.now()}`);
            const git = simpleGit();
            const {repoSource} = await inquirer.prompt([
                {
                    type:'list',
                    name:'repoSource',
                    message:'请选择下载源 / Select the download source',
                    choices:[
                        {name:'Gitee （国内源，速度快）','value':"gitee"},
                        {name:'Github','value':"github"}
                    ],
                    default:'github'
                }
            ])
            const gitRepo = repoSources[repoSource];

            console.log(chalk.yellow('Please Wait / 请稍后...'));
            console.log('开始克隆仓库...');
            await git.clone(gitRepo, tempCloneDir);
            // 移动JS文件到目标目录
            const jsFiles = await fs.readdir(tempCloneDir);
            for (const file of jsFiles) {
                if (file.endsWith('.js')) {
                    await fs.move(
                        path.join(tempCloneDir, file),
                        path.join(targetDir, 'sarucanvas/js', file)
                    );
                }
            }

            // 清理临时目录
            await fs.remove(tempCloneDir);

            // 创建index.html
            const indexHtmlContent = `<!DOCTYPE html>
<html>
<head>
  <title>${projectName}</title>
  <script src="./sarucanvas/js/saruCanvas.js"></script>
</head>
<body></body>
</html>`;

            await fs.writeFile(
                path.join(targetDir, 'index.html'),
                indexHtmlContent
            );

            // 创建saru.json
            const saruJsonContent = {
                name: projectName,
                author: os.userInfo().username,
                port: 2017
            };

            await fs.writeFile(
                path.join(targetDir, 'saru.json'),
                JSON.stringify(saruJsonContent, null, 2)
            );

            console.log(chalk.green('Finished / 安装完成'));
        } catch (error) {
            console.error(chalk.red(`错误: ${error.message}`));
            process.exit(1);
        }
    })

// run 命令
program
  .command('run [port]')
  .description('启动web服务器')
  .action(async (port) => {
    try {
      // 检查saru.json是否存在
      const saruJsonPath = path.resolve('saru.json');
      if (!await fs.pathExists(saruJsonPath)) {
        console.error(chalk.red('错误: 未找到saru.json文件'));
        process.exit(1);
      }

      // 读取配置
      const saruConfig = await fs.readJson(saruJsonPath);
      const serverPort = port || saruConfig.port || 2017;

      // 启动服务器
      console.log(chalk.blue(`启动服务器，端口: ${serverPort}`));
      const serve = require('serve');
      const server = serve('.', {
        port: serverPort,
        open: false
      });

      // 监听退出信号
      process.on('SIGINT', () => {
        server.stop();
        console.log(chalk.blue('服务器已停止'));
        process.exit(0);
      });
    } catch (error) {
      console.error(chalk.red(`错误: ${error.message}`));
      process.exit(1);
    }
  });

// init npm 命令
program
  .command('init npm')
  .description('创建npm项目模板')
  .action(() => {
    console.log(chalk.yellow('正在开发中: 支持创建vue、react、vite项目并嵌入sarucanvas'));
    // 这里可以后续实现具体逻辑
  });

// help 命令
program
  .command('help')
  .description('显示帮助信息')
  .action(() => {
    console.log(`saruCanvas CLI 工具 v${version}`);
    console.log('用法: saru <命令> [选项]\n');
    console.log('命令:');
    console.log('  create        创建新的saruCanvas项目');
    console.log('  run [port]    启动web服务器，可指定端口');
    console.log('  init npm      创建npm项目模板');
    console.log('  help          显示帮助信息');
    console.log('  version       显示版本信息\n');
    console.log('示例:');
    console.log('  saru create   创建新项目');
    console.log('  saru run 8080 启动服务器并使用8080端口');
  });

// 解析命令行参数
program.parse(process.argv);