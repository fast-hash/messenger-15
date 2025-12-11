import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { deleteDevice, listDevices, updateDeviceStatus } from '../api/deviceApi';
import { useAuthStore } from '../store/authStore';
import { formatMessageDate } from '../utils/dateUtils';
import ConfirmDialog from '../components/ConfirmDialog';

const statusLabel = {
  trusted: 'Доверенное',
  untrusted: 'Неподтверждено',
  revoked: 'Отозвано',
};

const statusClass = {
  trusted: 'badge badge-success',
  untrusted: 'badge badge-warning',
  revoked: 'badge badge-danger',
};

const DevicesPage = () => {
  const navigate = useNavigate();
  const { user, device: currentDevice } = useAuthStore();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const currentDeviceId = useMemo(() => currentDevice?.deviceId || null, [currentDevice]);

  const loadDevices = async () => {
    setLoading(true);
    try {
      const { devices: fetched } = await listDevices();
      setDevices(fetched || []);
      setError('');
    } catch (err) {
      setDevices([]);
      setError('Не удалось загрузить список устройств');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadDevices();
  }, [user]);

  const handleStatusChange = async (id, status) => {
    setUpdating(id);
    try {
      const { device } = await updateDeviceStatus(id, status);
      setDevices((prev) => prev.map((item) => (item.id === device.id ? device : item)));
      if (device.deviceId === currentDeviceId) {
        useAuthStore.setState((state) => ({ ...state, device }));
      }
    } catch (err) {
      setError('Не удалось обновить статус устройства');
    } finally {
      setUpdating(null);
    }
  };

  const header = (
    <div className="header-content">
      <div>
        <div className="app-title">Устройства</div>
        <div className="app-subtitle">Управление привязанными устройствами</div>
      </div>
      <div className="header-user">
        <button type="button" className="secondary-btn" onClick={() => navigate('/chats')}>
          Назад к чатам
        </button>
      </div>
    </div>
  );

  return (
    <Layout header={header}>
      <div className="card">
        <div className="card__header">
          <h3>Привязанные устройства</h3>
          <p className="muted">Добавленные устройства используются для проверки входов и будущего E2E.</p>
        </div>
        {loading && <div className="muted">Загрузка устройств...</div>}
        {error && <div className="error-text">{error}</div>}
        {!loading && !devices.length && <div className="muted">Устройства не найдены</div>}
        {!loading && devices.length > 0 && (
          <div className="table">
            <div className="table__head">
              <div>Название</div>
              <div>Платформа</div>
              <div>Статус</div>
              <div>Последняя активность</div>
              <div>IP</div>
              <div>Действия</div>
            </div>
            <div className="table__body">
              {devices.map((item) => (
                <div key={item.id} className="table__row">
                  <div>
                    <div className="table__title">{item.name}</div>
                    <div className="table__subtitle">{item.deviceId}</div>
                    {item.deviceId === currentDeviceId && <div className="badge">Текущее устройство</div>}
                  </div>
                  <div>{item.platform}</div>
                  <div>
                    <span className={statusClass[item.status] || 'badge'}>{statusLabel[item.status] || item.status}</span>
                  </div>
                  <div>{item.lastSeenAt ? formatMessageDate(item.lastSeenAt) : '—'}</div>
                  <div>{item.ipAddress || '—'}</div>
                  <div className="table__actions">
                    <button
                      type="button"
                      className="secondary-btn"
                      disabled={updating === item.id || item.status === 'revoked'}
                      onClick={() => handleStatusChange(item.id, 'trusted')}
                    >
                      Доверять
                    </button>
                    <button
                      type="button"
                      className="secondary-btn"
                      disabled={updating === item.id || item.status === 'revoked'}
                      onClick={() => handleStatusChange(item.id, 'untrusted')}
                    >
                      Пометить как новое
                    </button>
                    <button
                      type="button"
                      className="danger-btn"
                      disabled={updating === item.id || item.status === 'revoked'}
                      onClick={() => handleStatusChange(item.id, 'revoked')}
                    >
                      Отозвать
                    </button>
                    <button
                      type="button"
                      className="danger-btn"
                      disabled={updating === item.id || item.deviceId === currentDeviceId}
                      onClick={() => setConfirmDeleteId(item.id)}
                    >
                      Удалить запись
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {confirmDeleteId && (
        <ConfirmDialog
          text="Вы действительно хотите удалить запись об устройстве (данные)? Запись всё равно останется в журнале аудита."
          onConfirm={async () => {
            setUpdating(confirmDeleteId);
            try {
              await deleteDevice(confirmDeleteId);
              setDevices((prev) => prev.filter((device) => device.id !== confirmDeleteId));
            } catch (err) {
              setError('Не удалось удалить запись об устройстве');
            } finally {
              setUpdating(null);
              setConfirmDeleteId(null);
            }
          }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </Layout>
  );
};

export default DevicesPage;
