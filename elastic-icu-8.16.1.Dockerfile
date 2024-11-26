FROM elasticsearch:8.16.1
RUN /usr/share/elasticsearch/bin/elasticsearch-plugin install analysis-icu
