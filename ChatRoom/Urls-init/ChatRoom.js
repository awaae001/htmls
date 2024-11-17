window.openChatWindow = function(url) {
  window.open(url, '_blank', 'width=800,height=600,scrollbars=yes');
}

const chatroom = {
  // 定义用于存储用户头像的 Map 和头像索引
  userAvatarMap: new Map(),
  avatarIndex: 0,

  // 初始化方法，接受配置
  init: function () {
    const urlParams = new URLSearchParams(window.location.search);
    
    const containerId = "chatContainer";  // 假设容器的 ID 是固定的，可以根据需要调整
    const jsonFilePath = urlParams.get("jsonFilePath"); // 从 URL 查询参数中获取 JSON 文件路径
    const myAvatar = urlParams.get("myAvatar") || "https://example.com/default-avatar.png"; // 如果没有指定 myAvatar 使用默认头像
    const title = decodeURIComponent(urlParams.get("title") || "群聊的聊天记录");  // 从 URL 查询参数中获取聊天记录标题
    
    if (!jsonFilePath) {
      console.error("jsonFilePath is required in the URL.");
      return;
    }

    // 检查容器是否存在
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Chat container with id "${containerId}" not found.`);
      return;
    }

    // 加载 JSON 文件并生成聊天记录
    this.loadChatData(jsonFilePath)
      .then(chatData => {
        const chatContent = this.generateChatContent(chatData, myAvatar);
        container.innerHTML = this.generateChatBoxHTML(chatContent, title);
      })
      .catch(err => {
        console.error('Error loading chat data:', err);
      });
  },

  // 读取 JSON 文件，返回 Promise
  loadChatData: function (filePath) {
    return fetch(filePath)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to load chat data from ${filePath}`);
        }
        return response.json(); // 解析 JSON 数据
      });
  },

  // 生成聊天框的整体 HTML 结构
  generateChatBoxHTML: function (content, title) {
    const titleHtml = `<div class="chatBoxTitle"><i class="fa fa-chevron-left"></i><span class="chatTitleText">${title}</span><div class="chatBoxIcons"><i class="fa fa-group"></i><i class="fa fa-dedent"></i></div></div>`;
    return `<div class="chatContainer">${titleHtml}<div class="chatBox">${content}</div></div>`;
  },

  // 生成聊天内容
  generateChatContent: function (chatData, myAvatar) {
    let content = '';
    chatData.forEach(chatItem => {
      content += this.generateChatItem(chatItem, myAvatar);
    });
    return content;
  },

  // 生成单条聊天记录的 HTML
  generateChatItem: function (chatItem, myAvatar) {
    let name = chatItem.name ? chatItem.name.trim() : "未知";
    let content = chatItem.content ? chatItem.content.trim() : "无内容";
    let qqNumber = chatItem.qqNumber || null;

    // 判断是否是 "Me" 的消息
    const isMe = name.toLowerCase() === "me";
    const chatName = isMe ? '我' : name;
    const chatClass = isMe ? "me" : "";

    let avatarUrl;

    if (isMe) {
      avatarUrl = myAvatar; // 使用用户提供的我的头像
    } else if (qqNumber) {
      avatarUrl = `https://q1.qlogo.cn/g?b=qq&nk=${qqNumber}&s=100`;
    } else {
      avatarUrl = this.assignAvatar(name);
    }

    // 解析内容，替换标记为 HTML
    content = this.parseContent(content);

    return `
      <div class="chatItem ${chatClass}">
        <img class="chatAvatar no-lightbox" src="${avatarUrl}">
        <div class="chatContentWrapper">
          <b class="chatName">${chatName}</b>
          <div class="chatContent">${content}</div>
        </div>
      </div>
    `;
  },

  parseContent: function (content) {
    const imagePattern = /\[:image::(https?:\/\/[^\s]+?)::\]/g;
    const chatPattern = /\[:chat:\(([^)]+)\)::([^\s]+?)::\]/g;
    const linkPattern = /\[:a::(https?:\/\/[^\s]+?)::\]/g;
    const callPattern = /\[:call::@([^:]+?)::\]/g;
    const repPattern = /\[:rep:\[([^\]]+)\]:(.*?)::\]/g;  // 新增的模式，用于引用内容
    
    // 处理图片
    content = content.replace(imagePattern, function (match, p1) {
      return `<img class="chatMedia" src="${p1}" alt="Image" />`;
    });
  
    // 处理聊天记录
    content = content.replace(chatPattern, function (match, title, jsonFilePath) {
      const encodedTitle = encodeURIComponent(title);
      const encodedJsonFilePath = encodeURIComponent(jsonFilePath);
      const chatLink = `http://localhost:4000/Chatroom/?jsonFilePath=${encodedJsonFilePath}&title=${encodedTitle}`;
      return `
        <div class="chatQuoteCard">
            <div class="chatQuoteTetle">
            <i class="fa fa-database"></i>
            <span>转发的聊天记录</span>
            </div>
            <a class="chatMessage" onclick="openChatWindow('${chatLink}')">转发自：${title}</a>
        </div>
      `;
    });
  
    // 处理链接
    content = content.replace(linkPattern, function (match, p1) {
      return `<a href="${p1}" class="chatLink" target="_blank">${p1}</a>`;
    });
  
    // 处理@user调用
    content = content.replace(callPattern, function (match, username) {
      return `<span class="chatCall">@${username}</span>`;  // 显示为@username
    });
  
    // 处理引用内容
    content = content.replace(repPattern, function (match, username, quotedContent) {
      return `
        <div class="chatQuote">
          <div class="quoteUser">
          <i class="fa fa-share-square-o"></i>
          <span>${username}</span>
          </div>
          <span class="quotedMessage">${quotedContent}</span>
        </div>
      `;
    });
  
    return content;
  },  
  
  // 分配默认头像
  assignAvatar: function (name) {
    const avatars = [
      "https://i.p-i.vip/30/20240920-66ed9a608c2cf.png",
      "https://i.p-i.vip/30/20240920-66ed9b0655cba.png",
      "https://i.p-i.vip/30/20240920-66ed9b18a56ee.png",
      "https://i.p-i.vip/30/20240920-66ed9b2c199bf.png",
      "https://i.p-i.vip/30/20240920-66ed9b3350ed1.png",
      "https://i.p-i.vip/30/20240920-66ed9b5181630.png",
    ];

    if (!this.userAvatarMap.has(name)) {
      this.userAvatarMap.set(name, avatars[this.avatarIndex % avatars.length]);
      this.avatarIndex++;
    }
    return this.userAvatarMap.get(name);
  }
};

// 页面加载时自动初始化
document.addEventListener('DOMContentLoaded', function () {
  chatroom.init();  // 自动初始化
});
