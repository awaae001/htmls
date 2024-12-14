window.openChatWindow = function (url) {
    window.open(url, '_blank', 'width=450,height=650,scrollbars=yes');
};

const chatroom = {
    userAvatarMap: new Map(),
    avatarIndex: 0,

    init: function (config) {
        if (!config || typeof config !== 'object') {
            console.error('聊天室配置缺失或无效。');
            return;
        }

        const containerId = config.chatroomName;
        const jsonFilePath = config.jsonFilePath;
        const myAvatar = config.MyAvatar;

        if (!containerId || !jsonFilePath || !myAvatar) {
            console.error('必须提供聊天室名称 (containerId)、JSON 文件路径和用户头像 (MyAvatar)。');
            return;
        }

        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`未找到 id 为 "${containerId}" 的聊天容器。`);
            return;
        }

        this.loadChatData(jsonFilePath)
            .then((chatData) => {
                const chatContent = this.generateChatContent(chatData, myAvatar, config.hideAvatar);
                const chatBoxHTML = this.generateChatBoxHTML(chatContent, config.title || '群聊的聊天记录');

                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = chatBoxHTML;

                const fragment = document.createDocumentFragment();
                Array.from(tempDiv.children).forEach(child => fragment.appendChild(child));

                container.innerHTML = ''; // 清空之前的内容
                container.appendChild(fragment);
            })
            .catch((err) => {
                console.error('加载聊天数据时出错：', err.message);
            });
    },

    loadChatData: function (filePath) {
        return fetch(filePath)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`无法从 ${filePath} 加载聊天数据。`);
                }
                return response.json();
            })
            .then((data) => {
                if (!Array.isArray(data)) {
                    throw new Error('聊天数据必须是一个数组。');
                }
                data.forEach((chatItem, index) => {
                    if (typeof chatItem !== 'object' || !chatItem.name || !chatItem.content) {
                        throw new Error(`第 ${index} 项聊天数据无效：${JSON.stringify(chatItem)}`);
                    }
                });
                return data;
            });
    },

    generateChatBoxHTML: function (content, title) {
        const titleHtml = `<div class="chatBoxTitle"><i class="fa fa-chevron-left"></i><span class="chatTitleText">${title}</span><div class="chatBoxIcons"><i class="fa fa-group"></i><i class="fa fa-dedent"></i></div></div>`;
        return `<div class="chatContainer">${titleHtml}<div class="chatBox">${content}</div></div>`;
    },

    generateChatContent: function (chatData, myAvatar, hideAvatar) {
        let content = '';
        const sysProcessed = new Set();

        chatData.forEach((chatItem) => {
            if (chatItem.name && chatItem.name.toLowerCase() === 'sys') {
                content += this.generateSystemNotification(chatItem);
                sysProcessed.add(chatItem.content);
            } else if (!sysProcessed.has(chatItem.content)) {
                content += this.generateChatItem(chatItem, myAvatar, hideAvatar);
            }
        });

        return content;
    },

    generateChatItem: function (chatItem, myAvatar, hideAvatar) {
        let name = chatItem.name ? chatItem.name.trim() : '未知';
        let content = chatItem.content ? chatItem.content.trim() : '无内容';
        let avatar = chatItem.avatar || null;

        const isMe = name.toLowerCase() === 'me';
        const chatName = isMe ? '我' : name;
        const chatClass = isMe ? 'me' : '';

        let avatarUrl;
        if (isMe) {
            avatarUrl = myAvatar;
        } else if (avatar && avatar.startsWith('http')) {
            avatarUrl = avatar;
        } else if (avatar && !isNaN(Number(avatar))) {
            avatarUrl = `https://q1.qlogo.cn/g?b=qq&nk=${avatar}&s=100`;
        } else {
            avatarUrl = this.assignAvatar(name);
        }

        const avatarHTML = hideAvatar
            ? ''
            : `<img class="chatAvatar no-lightbox" src="${avatarUrl}" onerror="this.src='https://via.placeholder.com/100';">`;

        content = this.parseContent(content);

        return `
            <div class="chatItem ${chatClass}">
                ${avatarHTML}
                <div class="chatContentWrapper">
                    <b class="chatName">${chatName}</b>
                    <div class="chatContent">${content}</div>
                </div>
            </div>
        `;
    },

    generateSystemNotification: function (chatItem) {
        let content = chatItem.content ? chatItem.content.trim() : '无内容';
        content = this.parseContent(content);

        return `
            <div class="systemNotification">
                <div class="systemContent">${content}</div>
            </div>
        `;
    },

    parseContent: function (content) {
        const escapeHTML = (str) => {
            return str
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        };

        content = escapeHTML(content);

        const imagePattern = /\[:image::(https?:\/\/[^\s]+?)::\]/g;
        const chatPattern = /\[:chat:\(([^)]+)\)::([^\s]+?)::\]/g;
        const linkPattern = /\[:a::(https?:\/\/[^\s]+?)::\]/g;
        const callPattern = /\[:call::@([^:]+?)::\]/g;
        const repPattern = /\[:rep:\[([^\]]+)\]:(.*?)::\]/g;

        content = content.replace(imagePattern, (match, p1) => {
            const sanitizedUrl = encodeURI(p1);
            return `<img class="chatMedia" src="${sanitizedUrl}" alt="Image" />`;
        });

        content = content.replace(chatPattern, (match, title, jsonFilePath) => {
            const encodedTitle = encodeURIComponent(title);
            const encodedJsonFilePath = encodeURIComponent(jsonFilePath);
            const chatLink = `http://localhost:4000/Chatroom/?jsonFilePath=${encodedJsonFilePath}&title=${encodedTitle}`;
            return `
                <div class="chatQuoteCard">
                    <div class="chatQuoteTetle">
                        <i class="fa fa-database"></i>
                        <span>转发的聊天记录</span>
                    </div>
                    <a class="chatMessage" onclick="window.openChatWindow('${chatLink}')">转发自：${escapeHTML(title)}</a>
                </div>
            `;
        });

        content = content.replace(linkPattern, (match, p1) => {
            const sanitizedUrl = encodeURI(p1);
            return `<a href="${sanitizedUrl}" class="chatLink" target="_blank">${sanitizedUrl}</a>`;
        });

        content = content.replace(callPattern, (match, username) => {
            return `<span class="chatCall">@${escapeHTML(username)}</span>`;
        });

        content = content.replace(repPattern, (match, username, quotedContent) => {
            return `
                <div class="chatQuote">
                    <div class="quoteUser">
                        <i class="fa fa-share-square-o"></i>
                        <span>${escapeHTML(username)}</span>
                    </div>
                    <span class="quotedMessage">${escapeHTML(quotedContent)}</span>
                </div>
            `;
        });

        return content;
    },

    assignAvatar: function (name) {
        const avatars = [
            'https://i.p-i.vip/30/20240920-66ed9a608c2cf.png',
            'https://i.p-i.vip/30/20240920-66ed9b0655cba.png',
            'https://i.p-i.vip/30/20240920-66ed9b18a56ee.png',
            'https://i.p-i.vip/30/20240920-66ed9b2c199bf.png',
            'https://i.p-i.vip/30/20240920-66ed9b3350ed1.png',
            'https://i.p-i.vip/30/20240920-66ed9b5181630.png',
        ];

        if (this.userAvatarMap.size > 1000) {
            console.warn('头像映射表大小超出限制，正在清除缓存。');
            this.userAvatarMap.clear();
            this.avatarIndex = 0;
        }

        if (!this.userAvatarMap.has(name)) {
            this.userAvatarMap.set(name, avatars[this.avatarIndex % avatars.length]);
            this.avatarIndex++;
        }
        return this.userAvatarMap.get(name);
    },
};

if (typeof chatroom.init === 'object') {
    document.addEventListener('DOMContentLoaded', function () {
        chatroom.init(chatroom.init);
    });
}
