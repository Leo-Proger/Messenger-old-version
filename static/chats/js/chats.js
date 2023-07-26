let chatSocket = null;

const initialize = function (newChatUUID = null, newLastChatMessage = null, newRecipientImage = null) {
    scrollDown(document.getElementById('chat-messages'), 'sharp')
    const chatUUID = newChatUUID || JSON.parse(document.getElementById('json-chat_uuid').textContent);
    chatSocket = new WebSocket(`ws://${window.location.host}/ws/chats/${chatUUID}/`);

    const recipientImage = newRecipientImage || document.querySelector('.recipient-header-image > img').getAttribute('src');

    const chatMessagesContainer = document.getElementById('chat-messages');
    let currentMessageGroup = null;

    chatSocket.onmessage = function (event) {
        const data = JSON.parse(event.data);
        const {message, sender_id: senderID} = data;

        if (senderID === currentUserID) {
            const messageSentContainer = createMessageSentContainer(message);
            if (!currentMessageGroup || currentMessageGroup.classList.contains('message-group-received')) {
                currentMessageGroup = createMessageGroupSent();
                document.querySelector('#chat-messages > div').appendChild(currentMessageGroup);
            }

            currentMessageGroup.appendChild(messageSentContainer);
            fadeInLastSentMessage(currentMessageGroup);
        } else {
            if (currentMessageGroup && currentMessageGroup.classList.contains('message-group-received')) {
                const messagesContainer = currentMessageGroup.lastChild;
                const messageReceivedContainer = createMessageReceivedContainer(message);
                messagesContainer.appendChild(messageReceivedContainer);
            } else {
                currentMessageGroup = createMessageGroupReceived(recipientImage, message);
                document.querySelector('#chat-messages > div').appendChild(currentMessageGroup);
            }
        }

        scrollDown(chatMessagesContainer);
        updateLastChatMessage(chatUUID, newLastChatMessage || message);
        updateTimeLastChatMessage();

        prependChat(chatUUID);
    };

    chatSocket.onopen = function (event) {
        // console.log('open');
    };

    chatSocket.onclose = function (event) {
        // console.log('close');
    };

    // Отправка сообщения по нажатию на кнопку
    document.querySelector('.send-button').onclick = function (event) {
        sendMessage(event, chatUUID);
    };

    // Отправка сообщения по нажатию на Enter
    document.querySelector('.message-input').addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            sendMessage(event, chatUUID);
        }
    });

    // Прокрутка окна сообщений вниз
    scrollDown(chatMessagesContainer);
};

function createMessageSentContainer(message) {
    const messageSentContainer = document.createElement('div');
    messageSentContainer.classList.add('message-sent');

    const messageSentText = document.createElement('div');
    messageSentText.classList.add('message-sent-text');
    messageSentText.textContent = message;

    messageSentContainer.appendChild(messageSentText);

    return messageSentContainer;
}

function createMessageGroupSent() {
    const messageGroupSent = document.createElement('div');
    messageGroupSent.classList.add('message-group-sent');

    return messageGroupSent;
}

function createMessageReceivedContainer(message) {
    const messageReceivedContainer = document.createElement('div');
    messageReceivedContainer.classList.add('message-received', 'fade-in');

    const messageReceivedText = document.createElement('div');
    messageReceivedText.classList.add('message-received-text');
    messageReceivedText.textContent = message;

    messageReceivedContainer.appendChild(messageReceivedText);

    return messageReceivedContainer;
}

function createMessageGroupReceived(recipientImage, message) {
    const messageGroupReceived = document.createElement('div');
    messageGroupReceived.classList.add('message-group-received');

    const imgContainer = document.createElement('div');
    const messagesContainer = document.createElement('div');

    const imgElement = document.createElement('img');
    imgElement.src = recipientImage;
    imgElement.alt = '';

    imgContainer.appendChild(imgElement);

    const messageReceivedContainer = createMessageReceivedContainer(message);
    messagesContainer.appendChild(messageReceivedContainer);

    messageGroupReceived.appendChild(imgContainer);
    messageGroupReceived.appendChild(messagesContainer);

    return messageGroupReceived;
}

function fadeInLastSentMessage(currentMessageGroup) {
    const sentMessages = currentMessageGroup.getElementsByClassName('message-sent');
    if (sentMessages.length > 1) {
        const lastSentMessage = sentMessages[sentMessages.length - 1];
        lastSentMessage.classList.add('fade-in');
    }
}

function updateLastChatMessage(chatUUID, message) {
    const lastChatMessage = document.querySelector(`#chat-info-${chatUUID} > p`);
    lastChatMessage.textContent = message;
}

function updateTimeLastChatMessage() {
    const timeLastChatMessage = document.querySelector('.time-last-message');
    timeLastChatMessage.textContent = getTimeNow();
}

function sendMessage(event, chatUUID) {
    event.preventDefault();

    const messageInputDom = document.querySelector('.message-input');
    const message = messageInputDom.value;

    if (message.trim() !== '') {
        chatSocket.send(JSON.stringify({
            'chat_uuid': chatUUID,
            'message': message,
        }));
        messageInputDom.value = '';
        prependChat(chatUUID);
    }
}

// TODO: Разобраться тут с анимацией
function prependChat(chatUUID) {
    const chatBox = document.getElementById('chat-box');
    const chat = document.getElementById(chatUUID);
    chatBox.prepend(chat);
}

// Поиск по чатам
const searchInput = document.querySelector('.chat-search');
searchInput.addEventListener('input', () => searchContact(searchInput.value));

const chats = $('.chat');
const noResultsMessage = $('#no-results-message');

function searchContact(value) {
    let hasResults = false;

    chats.each(function () {
        const recipientName = $(this).find('.chat-info h3').text();
        const isMatch = recipientName.toLowerCase().includes(value.toLowerCase());

        if (isMatch) {
            $(this).slideDown();
            hasResults = true;
        } else {
            $(this).slideUp();
        }
    });

    noResultsMessage.toggleClass('d-none', hasResults);
}


function scrollDown(tag, note = null) {
    if (note === 'sharp') {
        tag.scrollTo({
            top: tag.scrollHeight,
            behavior: 'auto',
        });
    } else {
        tag.scrollTo({
            top: tag.scrollHeight,
            behavior: 'smooth',
        });
    }
}

function getTimeNow() {
    const currentDate = new Date();
    let hours = currentDate.getHours();
    let minutes = currentDate.getMinutes();

    // При необходимости отформатируйте часы и минуты с ведущими нулями
    if (hours < 10) {
        hours = "0" + hours;
    }
    if (minutes < 10) {
        minutes = "0" + minutes;
    }

    return hours + ":" + minutes;
}

function markMessagesAsRead(chatUUID) {
    const markAsReadUrl = `/inbox/notifications/mark-all-as-read/`;
    const xhr = new XMLHttpRequest();
    xhr.open('GET', markAsReadUrl, true);
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
            const chatElement = document.getElementById(chatUUID).querySelector('.unread-messages-count');
            if (chatElement !== null) {
                chatElement.remove();
            }
        }
    };
    xhr.send();
}

// Обработчик клика на элемент .chat
$(`.chat`).on('click', function () {
    const selectedChatUUID = $(this).data('chat-uuid');

    if (selectedChatUUID !== chatUUID) {
        const chatContent = $('#chat-content');
        const chatList = $('#chat-list');

        $.ajax({
            url: `/chats/${selectedChatUUID}/`,
            method: 'GET',
            success: (response) => {
                $(`#${selectedChatUUID}`).css({
                    'box-shadow': '0 0 15px 10px rgba(236, 236, 236, 0.2)'
                });
                if (chatUUID) {
                    $(`#${chatUUID}`).css({
                        'box-shadow': ''
                    })
                }

                const parsedHTML = $.parseHTML(response);
                const $parsedHTML = $(parsedHTML);

                chatContent.html($parsedHTML.find('#chat-content').html());
                document.title = $parsedHTML.filter('title').text();

                history.pushState(null, null, `/chats/${selectedChatUUID}/`);

                if (chatSocket !== null) {
                    chatSocket.close();
                }

                const newLastChatMessage = $parsedHTML.find(`#chat-info-${selectedChatUUID} > p`)[1];
                const newRecipientImage = $parsedHTML.find('.recipient-header-image > img').attr('src');

                initialize(selectedChatUUID, newLastChatMessage, newRecipientImage);

                chatUUID = selectedChatUUID;

                // TODO: При нажатии на маленьких экранах на чат, не прокручиваются вниз сообщения


                markMessagesAsRead(selectedChatUUID);

                chatList.removeClass().addClass('d-none d-md-block col-md-5');
                chatContent.removeClass().addClass('d-block col bg-black');
            },
            error: () => {
            }
        });
    }
});

