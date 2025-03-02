# -*- coding: utf-8 -*-
# pylint: disable=dangerous-default-value,too-many-public-methods
from __future__ import absolute_import

import logging
import unittest
from unittest import mock
from contextlib import contextmanager

import pytest

from ..services.ceph_service import CephService


class CephServiceTest(unittest.TestCase):
    pools = [{
        'pool_name': 'good_pool',
        'pool': 1,
    }, {
        'pool_name': 'bad_pool',
        'pool': 2,
        'flaky': 'option_x'
    }]

    def setUp(self):
        #  Mock get_pool_list
        self.list_patch = mock.patch('dashboard.services.ceph_service.CephService.get_pool_list')
        self.list = self.list_patch.start()
        self.list.return_value = self.pools
        #  Mock mgr.get
        self.mgr_patch = mock.patch('dashboard.mgr.get')
        self.mgr = self.mgr_patch.start()
        self.mgr.return_value = {
            'by_pool': {
                '1': {'active+clean': 16},
                '2': {'creating+incomplete': 16},
            }
        }
        self.service = CephService()

    def tearDown(self):
        self.list_patch.stop()
        self.mgr_patch.stop()

    def test_get_pool_by_attribute_with_match(self):
        self.assertEqual(self.service.get_pool_by_attribute('pool', 1), self.pools[0])
        self.assertEqual(self.service.get_pool_by_attribute('pool_name', 'bad_pool'), self.pools[1])

    def test_get_pool_by_attribute_without_a_match(self):
        self.assertEqual(self.service.get_pool_by_attribute('pool', 3), None)
        self.assertEqual(self.service.get_pool_by_attribute('not_there', 'sth'), None)

    def test_get_pool_by_attribute_matching_a_not_always_set_attribute(self):
        self.assertEqual(self.service.get_pool_by_attribute('flaky', 'option_x'), self.pools[1])

    @mock.patch('dashboard.mgr.rados.pool_reverse_lookup', return_value='good_pool')
    def test_get_pool_name_from_id_with_match(self, _mock):
        self.assertEqual(self.service.get_pool_name_from_id(1), 'good_pool')

    @mock.patch('dashboard.mgr.rados.pool_reverse_lookup', return_value=None)
    def test_get_pool_name_from_id_without_match(self, _mock):
        self.assertEqual(self.service.get_pool_name_from_id(3), None)

    def test_get_pool_pg_status(self):
        self.assertEqual(self.service.get_pool_pg_status('good_pool'), {'active+clean': 16})

    def test_get_pg_status_without_match(self):
        self.assertEqual(self.service.get_pool_pg_status('no-pool'), {})


@contextmanager
def mock_smart_data(data):
    devices = [{'devid': devid} for devid in data]

    def _get_smart_data(d):
        return {d['devid']: data[d['devid']]}

    with mock.patch.object(CephService, '_get_smart_data_by_device', side_effect=_get_smart_data), \
            mock.patch.object(CephService, 'get_devices_by_host', return_value=devices), \
            mock.patch.object(CephService, 'get_devices_by_daemon', return_value=devices):
        yield


@pytest.mark.parametrize(
    "by,args,log",
    [
        ('host', ('osd0',), 'from host osd0'),
        ('daemon', ('osd', '1'), 'with ID 1')
    ]
)
def test_get_smart_data(caplog, by, args, log):
    # pylint: disable=protected-access
    expected_data = {
        'aaa': {'device': {'name': '/dev/sda'}},
        'bbb': {'device': {'name': '/dev/sdb'}},
    }
    with mock_smart_data(expected_data):
        smart_data = getattr(CephService, 'get_smart_data_by_{}'.format(by))(*args)
        getattr(CephService, 'get_devices_by_{}'.format(by)).assert_called_with(*args)
        CephService._get_smart_data_by_device.assert_called()
        assert smart_data == expected_data

    with caplog.at_level(logging.DEBUG):
        with mock_smart_data([]):
            smart_data = getattr(CephService, 'get_smart_data_by_{}'.format(by))(*args)
            getattr(CephService, 'get_devices_by_{}'.format(by)).assert_called_with(*args)
            CephService._get_smart_data_by_device.assert_not_called()
            assert smart_data == {}
            assert log in caplog.text


@mock.patch.object(CephService, 'send_command')
def test_get_smart_data_from_appropriate_ceph_command(send_command):
    # pylint: disable=protected-access
    send_command.side_effect = [
        {'nodes': [{'name': 'osd.1', 'status': 'up'}, {'name': 'mon.1', 'status': 'down'}]},
        {'fake': {'device': {'name': '/dev/sda'}}}
    ]
    CephService._get_smart_data_by_device({'devid': '1', 'daemons': ['osd.1', 'mon.1']})
    send_command.assert_has_calls([mock.call('mon', 'osd tree'),
                                   mock.call('osd', 'smart', '1', devid='1')])

    send_command.side_effect = [
        {'nodes': [{'name': 'osd.1', 'status': 'down'}, {'name': 'mon.1', 'status': 'up'}]},
        {'fake': {'device': {'name': '/dev/sda'}}}
    ]
    CephService._get_smart_data_by_device({'devid': '1', 'daemons': ['osd.1', 'mon.1']})
    send_command.assert_has_calls([mock.call('mon', 'osd tree'),
                                   mock.call('mon', 'device get-health-metrics', '1', devid='1')])
