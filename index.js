const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions
    ]
});

const PREFIXES = ['d!', 'd.'];
const TOKEN = process.env.TOKEN || 'YOUR_BOT_TOKEN_HERE';

const autoRoles = new Map();

const Colors = {
    SUCCESS: 0x00FF00,
    ERROR: 0xFF0000,
    WARNING: 0xFFA500,
    INFO: 0x0099FF,
    NEUTRAL: 0x808080
};

// Sửa từ 'ready' thành 'clientReady' để tránh deprecation warning
client.once('clientReady', () => {
    console.log(`Prefix: ${PREFIXES.join(', ')}`);
    
    client.user.setActivity('d!help [command] | Developer by Duckright', { type: 3 });
    console.log('Bot đã khởi động thành công!');
});

// Xử lý rate limit
client.rest.on('rateLimited', (rateLimitInfo) => {
    console.log(`Rate limited: ${rateLimitInfo.timeToReset}ms`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    let prefix = null;
    for (const p of PREFIXES) {
        if (message.content.startsWith(p)) {
            prefix = p;
            break;
        }
    }
    
    if (!prefix) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'help') {
        const embed = new EmbedBuilder()
            .setColor(Colors.INFO)
            .setAuthor({ 
                name: 'Developer by Duckright', 
                iconURL: client.user.displayAvatarURL() 
            })
            .setTitle('📚 Roles Systems')
            .setDescription('-# ~~                                                                                                                 ~~\n> ``d!roles @user @roles``\n> ``d!roles rm @user``\n> ``d!roles del @user @roles``\n-# ~~                                                                                                                 ~~\n> ``d!roleauto @role``\n> ``d!roleauto list``\n> ``d!roleauto clear``\n-# ~~                                                                                                                 ~~\n> ``d!roleall @roles``\n-# ~~                                                                                                                 ~~')
            .setFooter({ 
                text: `Yêu cầu bởi ${message.author.tag}`, 
                iconURL: message.author.displayAvatarURL() 
            })
            .setTimestamp();

        return message.channel.send({ embeds: [embed] });
    }

    if (!message.member.permissions.has('ManageRoles')) {
        const errorEmbed = new EmbedBuilder()
            .setColor(Colors.ERROR)
            .setAuthor({ 
                name: 'MISSING PERMISSIONS', 
                iconURL: client.user.displayAvatarURL() 
            })
            .setDescription('-# ~~                                                                                                                 ~~\n> Bạn cần có quyền **Quản lý roles** để sử dụng lệnh này!\n-# ~~                                                                                                                 ~~')
            .setFooter({ text: 'Liên hệ Admin nếu cần hỗ trợ' })
            .setTimestamp();
        
        return message.channel.send({ embeds: [errorEmbed] });
    }

    if (command === 'roles') {
        await handleRolesCommand(message, args);
    }
    
    else if (command === 'roleauto') {
        await handleRoleAutoCommand(message, args);
    }
    
    else if (command === 'roleall') {
        await handleRoleAllCommand(message, args);
    }
});

client.on('guildMemberAdd', async (member) => {
    try {
        const guildId = member.guild.id;
        if (autoRoles.has(guildId)) {
            const roleIds = autoRoles.get(guildId);
            const rolesToAdd = roleIds
                .map(id => member.guild.roles.cache.get(id))
                .filter(role => role && role.editable);

            if (rolesToAdd.length > 0) {
                await member.roles.add(rolesToAdd);
                
                const logEmbed = new EmbedBuilder()
                    .setColor(Colors.SUCCESS)
                    .setTitle('AUTO ROLE - MEMBER JOIN')
                    .setDescription('-# ~~                                                                                                                 ~~\n> Đã tự động thêm roles cho **' + member.user.tag + '**\n-# ~~                                                                                                                 ~~')
                    .setThumbnail(member.user.displayAvatarURL())
                    .setTimestamp();
                
                console.log(`✅ Đã tự động thêm roles cho ${member.user.tag}`);
            }
        }
    } catch (error) {
        console.error('Lỗi khi thêm auto role:', error);
    }
});

async function handleRolesCommand(message, args) {
    if (args.length === 0) {
        const errorEmbed = new EmbedBuilder()
            .setColor(Colors.ERROR)
            .setAuthor({ name: '❌ SAI LỆNH', iconURL: client.user.displayAvatarURL() })
            .setDescription('-# ~~                                                                                                                 ~~\n> Vui lòng nhập đầy đủ thông tin!\n-# ~~                                                                                                                 ~~')
            .setFooter({ text: 'Gõ d!help để xem hướng dẫn' })
            .setTimestamp();
        
        return message.channel.send({ embeds: [errorEmbed] });
    }

    const subCommand = args[0].toLowerCase();
    
    if (subCommand === 'rm') {
        const member = message.mentions.members.first();
        if (!member) {
            const errorEmbed = new EmbedBuilder()
                .setColor(Colors.ERROR)
                .setAuthor({ name: '❌ LỖI', iconURL: client.user.displayAvatarURL() })
                .setDescription('-# ~~                                                                                                                 ~~\n> Vui lòng tag member cần xoá roles!\n> **📝 Ví dụ:** `d!roles rm @user`\n-# ~~                                                                                                                 ~~')
                .setTimestamp();
            
            return message.channel.send({ embeds: [errorEmbed] });
        }

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('confirm_rm')
                    .setLabel('XÁC NHẬN XOÁ')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('✅'),
                new ButtonBuilder()
                    .setCustomId('cancel_rm')
                    .setLabel('HUỶ')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('❌')
            );

        const confirmEmbed = new EmbedBuilder()
            .setColor(Colors.WARNING)
            .setAuthor({ name: '⚠️ CẢNH BÁO', iconURL: client.user.displayAvatarURL() })
            .setTitle('XÁC NHẬN XOÁ TẤT CẢ ROLES')
            .setDescription('-# ~~                                                                                                                 ~~\n> Bạn có chắc muốn xoá **TẤT CẢ** roles của **' + member.user.tag + '**?\n-# ~~                                                                                                                 ~~')
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 1024 }))
            .setFooter({ text: 'Xác nhận trong vòng 30 giây', iconURL: message.author.displayAvatarURL() })
            .setTimestamp();

        const reply = await message.channel.send({
            embeds: [confirmEmbed],
            components: [row]
        });

        const collector = reply.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 30000
        });

        collector.on('collect', async (interaction) => {
            if (interaction.user.id !== message.author.id) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(Colors.ERROR)
                    .setDescription('-# ~~                                                                                                                 ~~\n> Bạn không thể sử dụng nút này!\n-# ~~                                                                                                                 ~~');
                
                return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            if (interaction.customId === 'confirm_rm') {
                try {
                    const rolesToRemove = member.roles.cache.filter(role => role.id !== message.guild.id);
                    
                    if (rolesToRemove.size === 0) {
                        const errorEmbed = new EmbedBuilder()
                            .setColor(Colors.WARNING)
                            .setAuthor({ name: 'ℹ️ THÔNG BÁO', iconURL: client.user.displayAvatarURL() })
                            .setDescription('-# ~~                                                                                                                 ~~\n> **' + member.user.tag + '** không có roles nào để xoá!\n-# ~~                                                                                                                 ~~');
                        
                        return interaction.update({ embeds: [errorEmbed], components: [] });
                    }

                    await member.roles.remove(rolesToRemove);
                    
                    const successEmbed = new EmbedBuilder()
                        .setColor(Colors.SUCCESS)
                        .setAuthor({ name: '✅ THÀNH CÔNG', iconURL: client.user.displayAvatarURL() })
                        .setTitle('ĐÃ XOÁ TẤT CẢ ROLES')
                        .setDescription('-# ~~                                                                                                                 ~~\n> Đã xoá thành công **' + rolesToRemove.size + '** roles của **' + member.user.tag + '**\n-# ~~                                                                                                                 ~~')
                        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                        .setFooter({ text: `Thực hiện bởi ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
                        .setTimestamp();

                    await interaction.update({ embeds: [successEmbed], components: [] });
                } catch (error) {
                    console.error(error);
                    
                    const errorEmbed = new EmbedBuilder()
                        .setColor(Colors.ERROR)
                        .setAuthor({ name: '❌ LỖI', iconURL: client.user.displayAvatarURL() })
                        .setDescription('-# ~~                                                                                                                 ~~\n> Có lỗi xảy ra khi xoá roles!\n> **🔍 Chi tiết:** `' + error.message + '`\n-# ~~                                                                                                                 ~~');
                    
                    await interaction.update({ embeds: [errorEmbed], components: [] });
                }
            } else if (interaction.customId === 'cancel_rm') {
                const cancelEmbed = new EmbedBuilder()
                    .setColor(Colors.NEUTRAL)
                    .setAuthor({ name: '❌ ĐÃ HUỶ', iconURL: client.user.displayAvatarURL() })
                    .setDescription('-# ~~                                                                                                                 ~~\n> Đã huỷ thao tác xoá roles.\n-# ~~                                                                                                                 ~~');
                
                await interaction.update({ embeds: [cancelEmbed], components: [] });
            }
        });

        collector.on('end', () => {
            reply.edit({ components: [] }).catch(console.error);
        });
    }
    
    else if (subCommand === 'del') {
        const member = message.mentions.members.first();
        if (!member) {
            const errorEmbed = new EmbedBuilder()
                .setColor(Colors.ERROR)
                .setAuthor({ name: '❌ LỖI', iconURL: client.user.displayAvatarURL() })
                .setDescription('-# ~~                                                                                                                 ~~\n> Vui lòng tag member cần xoá roles!\n-# ~~                                                                                                                 ~~');
            
            return message.channel.send({ embeds: [errorEmbed] });
        }

        const roles = message.mentions.roles;
        if (roles.size === 0) {
            const errorEmbed = new EmbedBuilder()
                .setColor(Colors.ERROR)
                .setAuthor({ name: '❌ LỖI', iconURL: client.user.displayAvatarURL() })
                .setDescription('-# ~~                                                                                                                 ~~\n> Vui lòng tag các roles cần xoá!\n-# ~~                                                                                                                 ~~');
            
            return message.channel.send({ embeds: [errorEmbed] });
        }

        try {
            const removedRoles = [];
            const failedRoles = [];
            const notHaveRoles = [];

            for (const role of roles.values()) {
                if (member.roles.cache.has(role.id)) {
                    try {
                        await member.roles.remove(role);
                        removedRoles.push(role);
                    } catch {
                        failedRoles.push(role);
                    }
                } else {
                    notHaveRoles.push(role);
                }
            }

            let description = '-# ~~                                                                                                                 ~~\n';
            description += '> **Kết quả xử lý roles cho ' + member.user.tag + '**\n';
            description += '-# ~~                                                                                                                 ~~\n';

            if (removedRoles.length > 0) {
                description += '> **✅ ĐÃ XOÁ:**\n';
                removedRoles.forEach(r => {
                    description += '> <@&' + r.id + '>\n';
                });
                description += '-# ~~                                                                                                                 ~~\n';
            }

            if (notHaveRoles.length > 0) {
                description += '> **⏭️ KHÔNG CÓ:**\n';
                notHaveRoles.forEach(r => {
                    description += '> <@&' + r.id + '>\n';
                });
                description += '-# ~~                                                                                                                 ~~\n';
            }

            if (failedRoles.length > 0) {
                description += '> **❌ THẤT BẠI:**\n';
                failedRoles.forEach(r => {
                    description += '> <@&' + r.id + '>\n';
                });
                description += '-# ~~                                                                                                                 ~~\n';
            }

            const resultEmbed = new EmbedBuilder()
                .setColor(removedRoles.length > 0 ? Colors.SUCCESS : Colors.WARNING)
                .setAuthor({ 
                    name: removedRoles.length > 0 ? '✅ XOÁ ROLES THÀNH CÔNG' : 'ℹ️ KẾT QUẢ XỬ LÝ', 
                    iconURL: client.user.displayAvatarURL() 
                })
                .setDescription(description)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: `Thực hiện bởi ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
                .setTimestamp();

            await message.channel.send({ embeds: [resultEmbed] });
        } catch (error) {
            console.error(error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor(Colors.ERROR)
                .setAuthor({ name: '❌ LỖI', iconURL: client.user.displayAvatarURL() })
                .setDescription('-# ~~                                                                                                                 ~~\n> Có lỗi xảy ra khi xoá roles!\n> **🔍 Chi tiết:** `' + error.message + '`\n-# ~~                                                                                                                 ~~');
            
            await message.channel.send({ embeds: [errorEmbed] });
        }
    }
    
    else {
        const member = message.mentions.members.first();
        if (!member) {
            const errorEmbed = new EmbedBuilder()
                .setColor(Colors.ERROR)
                .setAuthor({ name: '❌ LỖI', iconURL: client.user.displayAvatarURL() })
                .setDescription('-# ~~                                                                                                                 ~~\n> Vui lòng tag member cần thêm roles!\n-# ~~                                                                                                                 ~~');
            
            return message.channel.send({ embeds: [errorEmbed] });
        }

        const roles = message.mentions.roles;
        if (roles.size === 0) {
            const errorEmbed = new EmbedBuilder()
                .setColor(Colors.ERROR)
                .setAuthor({ name: '❌ LỖI', iconURL: client.user.displayAvatarURL() })
                .setDescription('-# ~~                                                                                                                 ~~\n> Vui lòng tag các roles cần thêm!\n-# ~~                                                                                                                 ~~');
            
            return message.channel.send({ embeds: [errorEmbed] });
        }

        try {
            const addedRoles = [];
            const alreadyHasRoles = [];
            const failedRoles = [];

            for (const role of roles.values()) {
                if (!member.roles.cache.has(role.id)) {
                    try {
                        await member.roles.add(role);
                        addedRoles.push(role);
                    } catch {
                        failedRoles.push(role);
                    }
                } else {
                    alreadyHasRoles.push(role);
                }
            }

            let description = '-# ~~                                                                                                                 ~~\n';
            description += '> **Kết quả xử lý roles cho ' + member.user.tag + '**\n';
            description += '-# ~~                                                                                                                 ~~\n';

            if (addedRoles.length > 0) {
                description += '> **✅ ĐÃ THÊM:**\n';
                addedRoles.forEach(r => {
                    description += '> <@&' + r.id + '>\n';
                });
                description += '-# ~~      