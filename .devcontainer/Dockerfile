#-------------------------------------------------------------------------------------------------------------
# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License. See https://go.microsoft.com/fwlink/?linkid=2090316 for license information.
#-------------------------------------------------------------------------------------------------------------

FROM node:lts

# Avoid warnings by switching to noninteractive
ENV DEBIAN_FRONTEND=noninteractive

# Configure apt and install packages
RUN apt-get update \
  && apt-get -y install --no-install-recommends apt-utils dialog 2>&1 \
  #
  # Verify git and needed tools are installed
  && apt-get -y install git iproute2 procps direnv vim less \
  #
  # Install eslint globally
  && npm install -g eslint \
  #
  # Clean up
  && apt-get autoremove -y \
  && apt-get clean -y \
  && rm -rf /var/lib/apt/lists/*

# Install Zsh, Oh-My-Zsh and plugins
RUN sh -c "$(curl -sSL https://github.com/deluan/zsh-in-docker/releases/download/v1.1.1/zsh-in-docker.sh)" -- \
  -p git -p ssh-agent -p history-substring-search \
  -p https://github.com/zsh-users/zsh-autosuggestions \
  -p https://github.com/zsh-users/zsh-completions \
  -p https://github.com/zdharma/fast-syntax-highlighting \
  -a '[ -f /workspaces/contentful-migrate/.envrc ] && eval "$(direnv hook zsh)"'

# Override Powerlevel9(10)k prompt provided by zsh-in-docker
RUN echo 'POWERLEVEL9K_LEFT_PROMPT_ELEMENTS=(root_indicator dir vcs status)' >> ~/.zshrc

# Switch back to dialog for any ad-hoc use of apt-get
ENV DEBIAN_FRONTEND=
