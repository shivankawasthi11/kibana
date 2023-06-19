/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import archives from '../../common/fixtures/es_archiver/archives_metadata';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const archiveName = 'apm_8.0.0';
  const { end } = archives[archiveName];
  const start = new Date(Date.parse(end) - 600000).toISOString();

  const getOptions = () => ({
    params: {
      query: {
        start,
        end,
        serviceName: 'opbeans-java',
        transactionType: 'request' as string | undefined,
        environment: 'ENVIRONMENT_ALL',
        interval: '5m',
      },
    },
  });

  registry.when(`without data loaded`, { config: 'basic', archives: [] }, () => {
    it('transaction_duration (without data)', async () => {
      const options = getOptions();

      const response = await apmApiClient.readUser({
        endpoint: 'GET /internal/apm/rule_types/transaction_duration/chart_preview',
        ...options,
      });

      expect(response.status).to.be(200);
      expect(response.body.latencyChartPreview).to.eql([]);
    });
  });

  registry.when(`with data loaded`, { config: 'basic', archives: [archiveName] }, () => {
    it('transaction_duration (with data)', async () => {
      const options = getOptions();
      const response = await apmApiClient.readUser({
        ...options,
        endpoint: 'GET /internal/apm/rule_types/transaction_duration/chart_preview',
      });

      expect(response.status).to.be(200);
      expect(
        response.body.latencyChartPreview.some(
          (item: { name: string; data: Array<{ x: number; y: number | null }> }) =>
            item.data.some((coordinate) => coordinate.x && coordinate.y)
        )
      ).to.equal(true);
    });

    it('transaction_duration with transaction name', async () => {
      const options = {
        params: {
          query: {
            start,
            end,
            serviceName: 'opbeans-java',
            transactionName: 'DispatcherServlet#doGet',
            transactionType: 'request',
            environment: 'ENVIRONMENT_ALL',
            interval: '5m',
          },
        },
      };
      const response = await apmApiClient.readUser({
        ...options,
        endpoint: 'GET /internal/apm/rule_types/transaction_duration/chart_preview',
      });

      expect(response.status).to.be(200);
      expect(response.body.latencyChartPreview[0].data[0]).to.eql({
        x: 1627974600000,
        y: 18485.85714285714,
      });
    });

    it('transaction_duration with nonexistent transaction name', async () => {
      const options = {
        params: {
          query: {
            start,
            end,
            serviceName: 'opbeans-java',
            transactionType: 'request',
            transactionName: 'foo',
            environment: 'ENVIRONMENT_ALL',
            interval: '5m',
          },
        },
      };
      const response = await apmApiClient.readUser({
        ...options,
        endpoint: 'GET /internal/apm/rule_types/transaction_duration/chart_preview',
      });

      expect(response.status).to.be(200);
      expect(response.body.latencyChartPreview).to.eql([]);
    });
  });
}
