import json

from django.contrib.auth import get_user_model
from django.http import HttpResponse
from django.shortcuts import redirect, render, get_object_or_404
from django.urls import reverse_lazy, reverse
from django.views.generic import ListView, CreateView, DeleteView
from notifications.models import Notification

# from users.views import check_online
from .forms import MessageForm, ChatCreateForm
from .models import Chat, Message
from users.models import UserProfile, ConnectionHistory

User = get_user_model()


class ChatCreateView(CreateView):
	model = Chat
	template_name = 'chats/create_chat.html'
	form_class = ChatCreateForm
	success_url = reverse_lazy('chats:chat_list')

	def get_form_kwargs(self):
		kwargs = super().get_form_kwargs()
		kwargs['user'] = self.request.user.email
		return kwargs

	def form_valid(self, form):
		recipient = form.cleaned_data['recipient']
		# existing_chat = Chat.objects.filter(members=recipient).distinct().first()

		# if existing_chat:
		# 	return redirect('chats:chat_detail', chat_uuid=existing_chat.uuid)
		# else:
		chat = Chat.objects.create(created_by=self.request.user.email)
		chat.members.add(self.request.user.email, recipient)
		return redirect('chats:chat_detail', chat_uuid=chat.uuid)


class ChatDeleteView(DeleteView):
	model = Chat
	success_url = reverse_lazy('chats:chat_list')

	def delete(self, request, *args, **kwargs):
		chat = self.get_object()
		chat.delete()
		return redirect(self.get_success_url())


def is_ajax(request):
	return request.META.get('HTTP_X_REQUESTED_WITH') == 'XMLHttpRequest' or 'XMLHttpRequest' in request.headers.get(
		'Accept', '')


def chats_view(request, chat_uuid=None):
	# ----
	chat_list = request.user.chats.all()
	chats = []

	for chat in chat_list:
		recipient = chat.members.exclude(pk=request.user.pk).first()
		recipient_image = UserProfile.objects.get(user=recipient).profile_image
		recipient_online = ConnectionHistory.objects.get_or_create(user_id=recipient.id)[0].online_status
		last_chat_message = msg if (msg := Message.objects.filter(chat=chat).last()) else ''
		last_chat_message_time = last_chat_message.created_at
		unread_count = Notification.objects.filter(recipient=request.user, target_object_id=chat.id,
		                                           unread=True).count()
		chats.append((
			chat,
			recipient.get_full_name(),
			recipient_image,
			recipient_online,
			last_chat_message.message,
			last_chat_message_time,
			unread_count,
			))

	chats = sorted(chats, key=lambda x: x[5], reverse=True)
	# ----

	if chat_uuid:
		chat = Chat.objects.get(uuid=chat_uuid)
		messages = Message.objects.filter(chat=chat)
		recipient = chat.members.exclude(pk=request.user.pk).first()
		recipient_image = recipient.user_profiles.profile_image
		recipient_online = ConnectionHistory.objects.get_or_create(user_id=recipient.id)[0].online_status
		form = None

		if request.method == 'POST':
			form = MessageForm(request.POST)
			if form.is_valid():
				return redirect('chats:chat_detail', chat_uuid=chat_uuid)

		if form is None:
			form = MessageForm()

		Notification.objects.filter(recipient=request.user, target_object_id=chat.id).mark_all_as_read()

		context = {
			'messages': messages,
			'recipient': recipient.get_full_name(),
			'recipient_image': recipient_image,
			'recipient_online': recipient_online,
			'current_user': request.user.email,

			'chats': chats,
			'chat_uuid': chat_uuid,
			'chat_content': True,

			'form': form,
			}
	else:
		context = {
			'chats': chats,
			'chat_content': False,
			}
	return render(request, 'chats/chats.html', context)
