from django.shortcuts import render

def call(request):
    return render(request, 'call.html')